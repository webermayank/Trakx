import { Router } from "express";
import authRoutes from "./auth.js";
import accountRoutes from './account.js';
import transactionRoutes from './transaction.js';
import smsRoutes from './sms.js'
import categoryRoutes from './category.js'

const router = Router();

router.use("/auth", authRoutes);
router.use('/acc', accountRoutes);
router.use('/trxn', transactionRoutes);
router.use('/cats', categoryRoutes);
router.use('/ingest',smsRoutes );


export default router;
