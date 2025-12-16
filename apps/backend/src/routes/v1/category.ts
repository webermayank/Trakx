import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";

import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} from "../../controllers/category.controller.js";

const router = Router();

router.post("/categories", authMiddleware, createCategory);
router.get("/categories", authMiddleware, getCategories);
router.put("/categories/:id", authMiddleware, updateCategory);
router.delete("/categories/:id", authMiddleware, deleteCategory);

export default router;
