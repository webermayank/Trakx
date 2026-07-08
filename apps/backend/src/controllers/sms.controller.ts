import prisma from "@trakx/db";
import { type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { matchCategory } from "../utils/categoryMatch.js";
import { detectOrCreateAccount } from "../utils/detection.js";
import { generateSmsHash } from "../utils/smsHash.js";
import { parseSmsWithOpenAi } from "../utils/openaiSmsParser.js";
import { storeTrainingData } from "../utils/sms/trainingData.js";
import { logger } from "../utils/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

type SmsImportPayload = {
  sms: string;
  timestamp?: number | string | null;
  address?: string | null;
};

type SmsImportResult =
  | { status: "imported"; transactionId: string; transaction: unknown }
  | { status: "duplicate"; transactionId: string; reason: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum messages per bulk-ingest call */
const MAX_BATCH_SIZE = 200;

/** Maximum characters per SMS body (prevents prompt-injection via huge payloads) */
const MAX_SMS_LENGTH = 2000;

/** How many SMS messages we parse in parallel (limits OpenAI concurrency + cost) */
const PARSE_CONCURRENCY = 5;

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

export const ingestRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.userId) return req.user.userId;
    // Avoid using "req.ip" directly to prevent express-rate-limit IPv6 warnings
    const ipAddr = (req.socket && req.socket.remoteAddress) || "unknown";
    return ipAddr;
  },
  message: { error: "Too many ingest requests, please slow down." },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateSmsPayload(payload: SmsImportPayload): string | null {
  if (!payload.sms || typeof payload.sms !== "string") return "SMS body is required";
  if (payload.sms.length > MAX_SMS_LENGTH) return `SMS exceeds max length of ${MAX_SMS_LENGTH}`;
  return null;
}

async function processSmsImport(
  payload: SmsImportPayload,
  userId: string
): Promise<SmsImportResult> {
  const validationError = validateSmsPayload(payload);
  if (validationError) return { status: "failed", reason: validationError };

  const { sms, timestamp } = payload;

  const smsHash = generateSmsHash({
    sms,
    ...(payload.address !== undefined ? { sender: payload.address } : {}),
    ...(payload.timestamp !== undefined ? { timestamp: payload.timestamp } : {}),
  });

  const existing = await prisma.transaction.findFirst({ where: { userId, smsHash } });
  if (existing) {
    return { status: "duplicate", transactionId: existing.id, reason: "Duplicate SMS ignored" };
  }

  const parsed = await parseSmsWithOpenAi({
    sms,
    ...(payload.address !== undefined ? { address: payload.address } : {}),
  });

  await storeTrainingData({
    sms,
    sender: payload.address ?? null,
    parserOutput: parsed,
    confidence: parsed.confidence,
    timestamp: new Date().toISOString(),
  });

  if (!parsed.amount || !parsed.isTransactional) {
    return { status: "skipped", reason: parsed.reason || "Not a transactional SMS" };
  }

  const accountId = await detectOrCreateAccount({
    prisma,
    userId,
    sms,
    parsed,
    ...(payload.address !== undefined ? { address: payload.address } : {}),
  });

  const categoryId = await matchCategory(prisma, userId, parsed.merchant || "");
  const transactionDate =
    timestamp !== undefined && timestamp !== null && Number.isFinite(Number(timestamp))
      ? new Date(Number(timestamp))
      : new Date();

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId,
      amount: parsed.amount,
      date: transactionDate,
      merchant: parsed.merchant,
      direction: parsed.direction,
      paymentMethod: parsed.paymentMethod,
      description: sms,
      categoryId,
      smsHash,
    },
  });

  return {
    status: "imported",
    transactionId: transaction.id,
    transaction: {
      ...transaction,
      sender: parsed.sender,
      bank: parsed.bank,
      category: parsed.category,
      direction: parsed.direction,
      confidence: parsed.confidence,
      parserUsed: parsed.parserUsed,
      accountHint: parsed.accountHint,
      recurring: parsed.recurring,
      rawSms: parsed.rawSms,
    },
  };
}

// ─── Concurrency helper ───────────────────────────────────────────────────────
/** Run tasks in batches of `concurrency` to avoid overwhelming the OpenAI API */
async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency).map((fn) => fn());
    const batchResults = await Promise.allSettled(batch);
    results.push(...batchResults);
  }
  return results;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function classifySMSBatch(req: Request, res: Response) {
  const messages = req.body?.messages as SmsImportPayload[] | undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (messages.length > MAX_BATCH_SIZE) {
    return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} messages per request` });
  }

  const tasks = messages.map((message, index) => async () => {
    const validationError = validateSmsPayload(message);
    if (validationError) return { index, error: validationError };

    const parsed = await parseSmsWithOpenAi({
      sms: message.sms,
      ...(message.address !== undefined ? { address: message.address } : {}),
    });

    return {
      index,
      isTransactional: parsed.isTransactional,
      direction: parsed.direction,
      transactionStatus: parsed.transactionStatus,
      amount: parsed.amount,
      merchant: parsed.merchant,
      paymentMethod: parsed.paymentMethod,
      confidence: parsed.confidence,
      parserUsed: parsed.parserUsed,
      bank: parsed.bank,
      category: parsed.category,
      recurring: parsed.recurring,
      reason: parsed.reason ?? null,
    };
  });

  const settled = await runConcurrent(tasks, PARSE_CONCURRENCY);
  const results = settled.map((r) =>
    r.status === "fulfilled" ? r.value : { error: (r.reason as Error)?.message ?? "Parse error" }
  );

  return res.json({ success: true, results });
}

export async function ingestSMS(req: Request, res: Response) {
  const userId = req.user?.userId as string;

  const validationError = validateSmsPayload(req.body);
  if (validationError) return res.status(400).json({ error: validationError });

  const result = await processSmsImport(req.body as SmsImportPayload, userId);

  if (result.status === "failed") return res.status(400).json({ success: false, error: result.reason });
  if (result.status === "skipped") return res.json({ success: true, skipped: true, reason: result.reason });
  if (result.status === "duplicate") {
    return res.json({ success: true, duplicate: true, transactionId: result.transactionId, reason: result.reason });
  }

  return res.json({ success: true, transaction: result.transaction });
}

export async function ingestSMSBatch(req: Request, res: Response) {
  const userId = req.user?.userId as string;
  const messages = req.body?.messages as SmsImportPayload[] | undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  if (messages.length > MAX_BATCH_SIZE) {
    return res.status(400).json({ error: `Max ${MAX_BATCH_SIZE} messages per request` });
  }

  const summary = { total: messages.length, imported: 0, duplicates: 0, skipped: 0, failed: 0, errors: [] as string[] };

  const tasks = messages.map((message) => () => processSmsImport(message, userId));
  const settled = await runConcurrent(tasks, PARSE_CONCURRENCY);

  for (const result of settled) {
    if (result.status === "fulfilled") {
      const r = result.value;
      if (r.status === "imported") summary.imported++;
      else if (r.status === "duplicate") summary.duplicates++;
      else if (r.status === "skipped") {
        summary.skipped++;
        if (summary.errors.length < 10) summary.errors.push(r.reason);
      } else {
        summary.failed++;
        if (summary.errors.length < 10) summary.errors.push(r.reason);
      }
    } else {
      summary.failed++;
      const msg = (result.reason as Error)?.message ?? "Unknown error";
      if (summary.errors.length < 10) summary.errors.push(msg);
    }
  }

  logger.info({ userId, ...summary }, "SMS batch ingest completed");
  return res.json({ success: true, summary });
}
