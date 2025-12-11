import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import {
  createAccount,
  getAccounts,
  deleteAccount,
} from "../../controllers/account.controller.js";

const router = Router();

router.post("/accounts", authMiddleware, createAccount);
router.get("/accounts", authMiddleware, getAccounts);
router.delete("/accounts/:id", authMiddleware, deleteAccount);

export default router;
