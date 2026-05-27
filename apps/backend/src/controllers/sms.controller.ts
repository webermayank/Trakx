import prisma from "@trakx/db";
import { type Request, type Response } from "express";
import { matchCategory } from "../utils/categoryMatch.js";
import { detectOrCreateAccount } from "../utils/detection.js";
import { generateSmsHash } from "../utils/smsHash.js";
import { parseSmsWithOpenAi } from "../utils/openaiSmsParser.js";
import { storeTrainingData } from "../utils/sms/trainingData.js";

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

export async function classifySMSBatch(req: Request, res: Response) {
  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const results = await Promise.all(
      (messages as SmsImportPayload[]).map(async (message, index) => {
        const parsed = await parseSmsWithOpenAi({
          sms: message.sms,
          ...(message.address !== undefined ? { address: message.address } : {}),
        });

        await storeTrainingData({
          sms: message.sms,
          sender: message.address ?? null,
          parserOutput: parsed,
          confidence: parsed.confidence,
          timestamp: new Date().toISOString(),
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
      })
    );

    return res.json({ success: true, results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error classifying SMS batch" });
  }
}

async function processSmsImport(
  payload: SmsImportPayload,
  userId: string
): Promise<SmsImportResult> {
  const { sms, timestamp } = payload;

  if (!sms || typeof sms !== "string") {
    return { status: "failed", reason: "SMS is required" };
  }

  const smsHash = generateSmsHash(sms);
  const existing = await prisma.transaction.findFirst({
    where: { userId, smsHash },
  });

  if (existing) {
    return {
      status: "duplicate",
      transactionId: existing.id,
      reason: "Duplicate SMS ignored",
    };
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

  if (!parsed.amount) {
    return { status: "skipped", reason: "Could not detect amount" };
  }

  if (!parsed.isTransactional) {
    return {
      status: "skipped",
      reason: parsed.reason || "Not a transactional SMS",
    };
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

export async function ingestSMS(req: Request, res: Response) {
  try {
    const userId = req.user?.userId as string;
    const result = await processSmsImport(req.body, userId);

    if (result.status === "failed") {
      return res.status(400).json({ success: false, error: result.reason });
    }

    if (result.status === "skipped") {
      return res.json({ success: true, skipped: true, reason: result.reason });
    }

    if (result.status === "duplicate") {
      return res.json({
        success: true,
        duplicate: true,
        transactionId: result.transactionId,
        reason: result.reason,
      });
    }

    return res.json({ success: true, transaction: result.transaction });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error processing SMS" });
  }
}

export async function ingestSMSBatch(req: Request, res: Response) {
  try {
    const userId = req.user?.userId as string;
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }

    const summary = {
      total: messages.length,
      imported: 0,
      duplicates: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const message of messages as SmsImportPayload[]) {
      try {
        const result = await processSmsImport(message, userId);

        if (result.status === "imported") {
          summary.imported += 1;
        } else if (result.status === "duplicate") {
          summary.duplicates += 1;
        } else if (result.status === "skipped") {
          summary.skipped += 1;
          if (summary.errors.length < 10) {
            summary.errors.push(result.reason);
          }
        } else {
          summary.failed += 1;
          if (summary.errors.length < 10) {
            summary.errors.push(result.reason);
          }
        }
      } catch (error) {
        summary.failed += 1;
        if (summary.errors.length < 10) {
          summary.errors.push(
            error instanceof Error ? error.message : "Unknown SMS import error"
          );
        }
      }
    }

    return res.json({ success: true, summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error processing SMS batch" });
  }
}
