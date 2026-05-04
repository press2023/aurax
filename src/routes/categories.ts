import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";
import { deleteR2Objects } from "./upload.js";

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

categoriesRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    res.status(201).json(category);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

categoriesRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      select: { image: true },
    });
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (existing?.image && existing.image !== category.image) {
      await deleteR2Objects([existing.image]);
    }
    res.json(category);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

categoriesRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    // Collect images from category + all its products before delete
    const existing = await prisma.category.findUnique({
      where: { id: req.params.id },
      select: {
        image: true,
        products: { select: { image: true, images: true } },
      },
    });
    await prisma.category.delete({ where: { id: req.params.id } });
    if (existing) {
      const all: string[] = [];
      if (existing.image) all.push(existing.image);
      for (const p of existing.products) {
        if (p.image) all.push(p.image);
        all.push(...(p.images || []));
      }
      if (all.length) await deleteR2Objects(all);
    }
    res.status(204).end();
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
