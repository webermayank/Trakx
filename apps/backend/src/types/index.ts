import { z } from "zod";

export const SignupSchema = z.object({
  name: z.string(),
  passwordHash: z.string(),
  email: z.email(),
});

export const SigninSchema = z.object({
  email: z.email(),
  passwordHash: z.string(),
});

export const CreateAccountSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["bank", "card", "upi"]),
  balance: z.number().optional().default(0),
});


export const CreateTransactionSchema = z.object({
  amount: z.number().positive(),
  date: z.iso.datetime().optional(),
  merchant: z.string().optional(),
  description: z.string().optional(),
  paymentMethod: z.enum(["upi", "bank", "card"]).optional(),
  accountId: z.string(),
  categoryId: z.string().optional(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  keywords: z.array(z.string()).default([]), // for auto-categorization later
});

export const UpdateCategorySchema = z.object({
  name: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});
