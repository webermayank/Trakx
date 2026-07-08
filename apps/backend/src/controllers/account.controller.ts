import { CreateAccountSchema } from "../types/index.js";
import { type Request, type Response } from "express";
import prisma from "@trakx/db";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── POST /acc/accounts ───────────────────────────────────────────────────────
export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const parse = CreateAccountSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid data", issues: parse.error.issues });
  }

  const { name, type, balance } = parse.data;
  const userId = req.user!.userId;

  const account = await prisma.account.create({
    data: { name, type, balance, userId },
  });

  return res.status(201).json({ accountId: account.id });
});

// ─── GET /acc/accounts ────────────────────────────────────────────────────────
export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: { id: true, name: true, type: true, balance: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return res.json(accounts);
});

// ─── DELETE /acc/accounts/:id ─────────────────────────────────────────────────
export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const accountId = req.params.id;
  const userId = req.user!.userId;

  if (!accountId) return res.status(400).json({ error: "Account ID is required" });

  const result = await prisma.account.deleteMany({ where: { id: accountId, userId } });
  if (!result.count) return res.status(404).json({ error: "Account not found" });

  return res.json({ message: "Account deleted successfully" });
});
