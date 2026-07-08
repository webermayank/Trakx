import { type Request, type Response } from "express";
import multer from "multer";
import prisma from "@trakx/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { parseBankStatement, detectBank } from "../utils/pdfParser.js";
import { matchCategory } from "../utils/categoryMatch.js";
import { detectOrCreateAccount } from "../utils/detection.js";
import { logger } from "../utils/logger.js";

// pdf-parse is a CommonJS module — use dynamic import for ESM compatibility
async function pdfParse(buffer: Buffer): Promise<{ text: string }> {
  const mod = await import("pdf-parse/lib/pdf-parse.js" as string);
  const fn = (mod.default ?? mod) as (buf: Buffer) => Promise<{ text: string }>;
  return fn(buffer);
}

// ─── Multer configuration (memory storage — no files written to disk) ─────────
export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

// ─── POST /ingest/pdf — Upload and parse a bank statement ────────────────────
export const ingestPdf = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & { file?: Express.Multer.File }).file;

  if (!file) {
    return res.status(400).json({ error: "No PDF file uploaded" });
  }

  const userId = req.user!.userId;
  const filename = file.originalname ?? "statement.pdf";

  // Create a PdfImport record so the frontend can poll status
  const pdfImport = await prisma.pdfImport.create({
    data: { userId, filename, status: "processing" },
  });

  logger.info({ userId, importId: pdfImport.id, filename }, "PDF import started");

  try {
    // Extract text from PDF
    const { text } = await pdfParse(file.buffer);

    const bank = detectBank(text);
    const statement = parseBankStatement(text);

    await prisma.pdfImport.update({
      where: { id: pdfImport.id },
      data: { bank: statement.bank, totalRows: statement.rows.length },
    });

    // Return parsed rows for preview — the frontend decides what to import
    return res.json({
      importId: pdfImport.id,
      bank: statement.bank,
      totalRows: statement.rows.length,
      warnings: statement.warnings,
      preview: statement.rows.slice(0, 5), // First 5 rows for preview
      rows: statement.rows.map((row, i) => ({
        index: i,
        date: row.date.toISOString(),
        description: row.description,
        amount: row.amount,
        direction: row.direction,
        balance: row.balance ?? null,
        reference: row.reference ?? null,
      })),
    });
  } catch (err) {
    await prisma.pdfImport.update({
      where: { id: pdfImport.id },
      data: { status: "failed", errorMessage: (err as Error).message },
    });
    logger.error({ userId, importId: pdfImport.id, err }, "PDF parse failed");
    throw err;
  }
});

// ─── POST /ingest/pdf/:importId/confirm — Commit selected rows ───────────────
export const confirmPdfImport = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { importId } = req.params as { importId: string };
  const { rows } = req.body as {
    rows: Array<{
      date: string;
      description: string;
      amount: number;
      direction: "debit" | "credit";
      categoryId?: string;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows array is required" });
  }

  const pdfImport = await prisma.pdfImport.findFirst({ where: { id: importId, userId } });
  if (!pdfImport) return res.status(404).json({ error: "Import not found" });
  if (pdfImport.status === "completed") return res.status(409).json({ error: "Import already completed" });

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const parsed = {
        amount: row.amount,
        direction: row.direction,
        merchant: row.description.slice(0, 100),
        paymentMethod: "BANK" as const,
        accountHint: null,
        isTransactional: true,
        bank: (pdfImport.bank ?? "UNKNOWN") as any,
        sender: undefined as any,
        category: "OTHER" as any,
        recurring: false,
        rawSms: "",
        confidence: 1,
        transactionStatus: "completed" as const,
        transactionDate: undefined as any,
        reason: "",
        parserUsed: "pdf" as any,
      };

      const accountId = await detectOrCreateAccount({ prisma, userId, sms: row.description, parsed });
      const categoryId = row.categoryId ?? await matchCategory(prisma, userId, row.description);

      await prisma.transaction.create({
        data: {
          userId,
          accountId,
          amount: row.amount,
          date: new Date(row.date),
          merchant: row.description.slice(0, 100),
          description: row.description,
          paymentMethod: "BANK",
          direction: row.direction,
          categoryId,
          pdfImportId: importId ?? null,
        },
      });

      imported++;
    } catch (err) {
      failed++;
      if (errors.length < 10) errors.push((err as Error).message);
    }
  }

  await prisma.pdfImport.update({
    where: { id: importId },
    data: { status: "completed", imported, failed },
  });

  logger.info({ userId, importId, imported, failed }, "PDF import confirmed");

  return res.json({ success: true, imported, failed, errors });
});

// ─── GET /ingest/pdf/:importId — Get import status ───────────────────────────
export const getPdfImportStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { importId } = req.params as { importId: string };

  const pdfImport = await prisma.pdfImport.findFirst({ where: { id: importId, userId } });
  if (!pdfImport) return res.status(404).json({ error: "Import not found" });

  return res.json(pdfImport);
});
