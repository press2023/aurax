import { Router } from "express";
import { prisma } from "../db.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    res.json(categories);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

categoriesRouter.get("/:slug", async (req, res) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { products: true },
    });
    if (!category) return res.status(404).json({ error: "Not found" });
    res.json(category);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

categoriesRouter.post("/", async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json(category);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

categoriesRouter.patch("/:id", async (req, res) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(category);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

categoriesRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
