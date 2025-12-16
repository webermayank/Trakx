import prisma from "@trakx/db";
import { type Request, type Response } from "express";
import { UpdateCategorySchema, CreateCategorySchema } from "../types/index.js";

//create categoryes

export const createCategory = async (req: Request, res: Response) => {
  const parsed = CreateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = req.user?.userId as string;

  const category = await prisma.category.create({
    data: {
      name: parsed.data.name,
      keywords: parsed.data.keywords,
      userId,
    },
  });

  return res.status(201).json({ categoryId: category.id });
};

//getting categories

export const getCategories = async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;

  const cats = await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return res.json(cats);
};

//updating catgry

export const updateCategory = async (req: Request, res: Response) => {
  const parsed = UpdateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const userId = req.user?.userId as string;
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: "Id not found" });
  }
  
  const updatedData : any = {};
  if (parsed.data.name !== undefined) {
      updatedData.name = parsed.data.name;
    }
    if (parsed.data.keywords !== undefined) {
        updatedData.keywords = parsed.data.keywords;
    }
      const updated = await prisma.category.updateMany({
        where: { id, userId },
        data: updatedData,
      });
  if (updatedData.count === 0) {
    return res.status(404).json({ error: "Category not found" });
  }
  return res.json({ message: "Category updated" });
};

//delete
export const deleteCategory = async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const id = req.params.id;
 if (!id) {
   return res.status(400).json({ error: "Id not found" });
 }
  const deleted = await prisma.category.deleteMany({
    where: { id, userId },
  });

  if (!deleted.count) {
    return res.status(404).json({ error: "Category not found" });
  }

  return res.json({ message: "Category deleted" });
};