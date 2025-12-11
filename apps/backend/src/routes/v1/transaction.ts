import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";

import {
  createTransaction,
  getTransaction,
  getTransactions,
  deleteTransaction,
} from "../../controllers/transaction.controller.js";

const router = Router();

router.post("/transactions", authMiddleware, createTransaction);
router.get("/transactions", authMiddleware, getTransactions);
router.get("/transactions/:id", authMiddleware, getTransaction);
router.delete("/transactions/:id", authMiddleware, deleteTransaction);

export default router;