import prisma from '@trakx/db';
import { type Request, type Response } from 'express';
import {parseSMS} from '../utils/smsParser.js'
import { matchCategory } from "../utils/categoryMatch.js";
import { detectAccount } from "../utils/detection.js";



export async function ingestSMS(req : Request , res : Response) {
    
    try {
      const { sms } = req.body;
      const userId = req.user?.userId as string;

      if (!sms || typeof sms !== "string") {
        return res.status(400).json({ error: "SMS is required" });
      }

      //  Parse SMS
      const parsed = parseSMS(sms);
      if (!parsed.amount) {
        return res.status(400).json({ error: "Could not detect amount" });
      }

      
      // 2. Detect account
      const accountId = await detectAccount(prisma, userId, sms);
      if (!accountId) {
        return res.status(400).json({ error: "Account could not be detected" });
      }

      // 3. Detect category
      const categoryId = await matchCategory(prisma, userId, parsed.merchant || "");

      // 4. Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          userId,
          accountId,
          amount: parsed.amount ?? 0,
          merchant: parsed.merchant,
          paymentMethod: parsed.paymentMethod,
          description: sms,
          categoryId,
        },
      });

      return res.json({ success: true, transaction });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error processing SMS" });
    }
}