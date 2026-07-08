import prisma from "@trakx/db";
import { type Request, type Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── GET /analysis/summary ────────────────────────────────────────────────────
export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const [total, last30Days] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { amount: true },
    }),
  ]);

  return res.json({
    totalSpent: total._sum.amount ?? 0,
    totalTransactions: total._count,
    last30DaysSpent: last30Days._sum.amount ?? 0,
  });
});

// ─── GET /analysis/by-category ───────────────────────────────────────────────
export const byCategory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const [data, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.category.findMany({ where: { userId } }),
  ]);

  const result = data.map((d) => ({
    category: categories.find((c) => c.id === d.categoryId)?.name ?? "Uncategorized",
    amount: d._sum.amount ?? 0,
    count: d._count,
  }));

  return res.json(result);
});

// ─── GET /analysis/monthly ────────────────────────────────────────────────────
// Uses DB-level grouping instead of fetching all rows into memory
export const monthly = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // Prisma doesn't have a native groupBy date-truncate, so we use a raw query
  // that is safe because userId comes from the verified JWT, not from request params
  const rows = await prisma.$queryRaw<{ month: string; amount: number }[]>`
    SELECT
      to_char("date", 'YYYY-MM') AS month,
      COALESCE(SUM(amount), 0)::float AS amount
    FROM "Transaction"
    WHERE "userId" = ${userId}
    GROUP BY to_char("date", 'YYYY-MM')
    ORDER BY month ASC
  `;

  return res.json(rows);
});

// ─── GET /analysis/by-account ─────────────────────────────────────────────────
export const byAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const [data, accounts] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId"],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.account.findMany({ where: { userId } }),
  ]);

  const result = data.map((d) => ({
    account: accounts.find((a) => a.id === d.accountId)?.name ?? "Unknown",
    amount: d._sum.amount ?? 0,
    count: d._count,
  }));

  return res.json(result);
});
