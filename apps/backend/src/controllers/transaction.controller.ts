import prisma from '@trakx/db';
import { type Request, type Response } from 'express';
import { CreateAccountSchema, CreateTransactionSchema } from '../types/index.js';


export const createTransaction = async ( req : Request , res: Response) =>{
    const parsed = CreateTransactionSchema.safeParse(req.body);

    if(!parsed.success){
      console.log("no tractiuon data")
        return res.status(400).json({ 
            error: parsed.error
        });
    }
    const userId = req.user?.userId as string;

    const { amount, date, merchant, description, paymentMethod, accountId, categoryId } =
    parsed.data;

    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      return res
        .status(403)
        .json({ error: "Account not found or unauthorized" });
    }

   const transaction = await prisma.transaction.create({
     data: {
       amount,
       date: date ? new Date(date) : new Date(),
       merchant: merchant ?? null,
       description: description ?? null,
       paymentMethod: paymentMethod ?? null,
       accountId,
       userId,
       categoryId: categoryId ?? null, // optional too
     },
   });
     return res.status(201).json({ transactionId: transaction.id });

}

//get every transaction

export const getTransactions = async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;

    const txns = await prisma.transaction.findMany({
        where :{ userId },
        orderBy : { date : "desc" },
        include : {
            account : { select : { name : true , type : true}},
            category : { select : {name : true}},
        }
    })
    
    return res.json(txns);

}

//get single transatcion

export const getTransaction = async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const id = req.params.id;

   if (!id) {
     return res.status(400).json({ error: "Transaction ID is required" });
   }
  const txn = await prisma.transaction.findFirst({
    where : { id, userId}
  });
    if (!txn) return res.status(404).json({ error: "Transaction not found" });

      return res.json(txn);

}

//delete transaction

export const deleteTransaction = async (req: Request, res: Response) => {
  const id = req.params.id;
  const userId = req.user?.userId as string;

  if (!id) {
    return res.status(400).json({ error: "Transaction id required" });
  }

  await prisma.transaction.deleteMany({
    where: { id, userId },
  });

  return res.json({ message: "Transaction deleted" });
};