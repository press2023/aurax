import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";
import { deleteR2Objects } from "./upload.js";

export const productsRouter = Router();

// GET /api/products?category=&gender=&search=&featured=
productsRouter.get("/", async (req, res) => {
  try {
    const { category, gender, search, featured } = req.query;
    const where: any = {};
    if (category) where.category = { slug: String(category) };
    if (gender) where.gender = String(gender);
    if (featured) where.featured = featured === "true";
    if (search) {
      const q = String(search);
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
      ];
    }
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/products/:slug
productsRouter.get("/:slug", async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/products (admin)
productsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const product = await prisma.product.create({ data: req.body });
    res.status(201).json(product);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/products/:id (admin)
productsRouter.patch("/:id", requireAdmin, async (req, res) => {
  try {
    // If the client is changing image or images array, clean up orphan R2 files
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { image: true, images: true },
    });
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    if (existing) {
      const before = new Set<string>([existing.image, ...(existing.images || [])].filter(Boolean));
      const after = new Set<string>([product.image, ...(product.images || [])].filter(Boolean));
      const orphans = [...before].filter((u) => !after.has(u));
      if (orphans.length) await deleteR2Objects(orphans);
    }
    res.json(product);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/products/:id (admin)
productsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { image: true, images: true },
    });
    await prisma.product.delete({ where: { id: req.params.id } });
    if (existing) {
      const all = [existing.image, ...(existing.images || [])].filter(Boolean);
      if (all.length) await deleteR2Objects(all);
    }
    res.status(204).end();
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
