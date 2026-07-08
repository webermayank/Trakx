import prisma from "@trakx/db";
import { type Request, type Response } from "express";
import { CreateTransactionSchema } from "../types/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── POST /trxn/transactions ──────────────────────────────────────────────────
export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateTransactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid data", issues: parsed.error.issues });
  }

  const userId = req.user!.userId;
  const { amount, date, merchant, description, paymentMethod, direction, accountId, categoryId } =
    parsed.data;

  const account = await prisma.account.findFirst({ where: { id: accountId, userId } });
  if (!account) {
    return res.status(403).json({ error: "Account not found or unauthorized" });
  }

  const transaction = await prisma.transaction.create({
    data: {
      amount,
      date: date ? new Date(date) : new Date(),
      merchant: merchant ?? null,
      description: description ?? null,
      paymentMethod: paymentMethod ?? null,
      direction: direction ?? null,
      accountId,
      userId,
      categoryId: categoryId ?? null,
    },
  });

  return res.status(201).json({ transactionId: transaction.id });
});

// ─── GET /trxn/transactions  (paginated) ─────────────────────────────────────
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Pagination params with safe defaults
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
  const skip = (page - 1) * limit;

  // Optional filters
  const category = req.query.category as string | undefined;
  const direction = req.query.direction as string | undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  const where = {
    userId,
    ...(direction ? { direction } : {}),
    ...(category ? { category: { name: category } } : {}),
    ...(from || to
      ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  };

  const [txns, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        account: { select: { name: true, type: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return res.json({
    data: txns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: skip + limit < total,
      hasPrev: page > 1,
    },
  });
});

// ─── GET /trxn/transactions/:id ───────────────────────────────────────────────
export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = req.params.id;

  if (!id) return res.status(400).json({ error: "Transaction ID is required" });

  const txn = await prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      account: { select: { name: true, type: true } },
      category: { select: { name: true } },
    },
  });

  if (!txn) return res.status(404).json({ error: "Transaction not found" });
  return res.json(txn);
});

// ─── DELETE /trxn/transactions/:id ───────────────────────────────────────────
export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = req.user!.userId;

  if (!id) return res.status(400).json({ error: "Transaction ID is required" });

  const result = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (!result.count) return res.status(404).json({ error: "Transaction not found" });

  return res.json({ message: "Transaction deleted" });
});

// ─── PATCH /trxn/transactions/:id/category ───────────────────────────────────
export const updateTransactionCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = req.user!.userId;
  const { categoryId } = req.body as { categoryId?: string };

  if (!id) return res.status(400).json({ error: "Transaction ID is required" });

  const txn = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!txn) return res.status(404).json({ error: "Transaction not found" });

  const updated = await prisma.transaction.update({
    where: { id },
    data: { categoryId: categoryId ?? null },
  });

  return res.json(updated);
});
