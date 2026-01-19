import e, { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import {
  getSummary,
  byCategory,
  monthly,
  byAccount,
} from "../../controllers/analytical.controller.js";


const router = Router();

router.get("/analytics/summary", authMiddleware, getSummary);
router.get("/analytics/by-category", authMiddleware, byCategory);
router.get("/analytics/monthly", authMiddleware, monthly);
router.get("/analytics/by-account", authMiddleware, byAccount);

export default router;