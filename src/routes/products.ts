import { Router } from "express";
import { prisma } from "../db.js";
import { requireAdmin } from "../auth.js";

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
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(product);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/products/:id (admin)
productsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
