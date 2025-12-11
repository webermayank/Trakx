import { Router } from "express";
import authRoutes from "./auth.js";
import accountRoutes from './account.js';
import transationRoutes from './transaction.js'
// import userRoutes from "./user.js";
const router = Router();

router.use("/auth", authRoutes);
router.use('/acc', accountRoutes);
router.use('/trxn', transationRoutes);
// router.use("/user", userRoutes);

export default router;
