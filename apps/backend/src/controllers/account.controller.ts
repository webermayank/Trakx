import { CreateAccountSchema } from "../types/index.js";
import { type Request, type Response } from "express";

import prisma from "@trakx/db";

export const createAccount = async (req: Request, res: Response) => {
  const parse = CreateAccountSchema.safeParse(req.body);
console.log("1111")
if (!parse.success) {
  
  console.log("no data")
    return res.status(400).json({ error: parse.error });
  }
  const { name, type, balance } = parse.data;

  const userId = req.user?.userId;

  if (!userId) {
    console.log("nouserId")
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const account = await prisma.account.create({
      data: { name, type, balance, userId },
    });

    return res.status(201).json({ accountId: account.id });
  } catch (e) {
    return res.status(500).json({ error: "Error creating account" });
  }
};


//getting all accounts

export const getAccounts = async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const accounts = await prisma.account.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      balance: true,
      createdAt: true,
    },
  });

  return res.json(accounts);
};

//delete account
export const deleteAccount = async (req: Request, res: Response) => {
  const accountId = req.params.id;
  const userId = req.user?.userId as string;
 if (!accountId) {
   return res.status(400).json({ error: "Account ID is required" });
 }
  try {
    await prisma.account.deleteMany({
      where: { 
        id: accountId, 
        userId 
      }, 
    });

    return res.json({ message: "Account deleted successfully" });
  } catch {
    return res.status(400).json({ error: "Account not found or unauthorized" });
  }
};

