import { Router } from "express";
import { prisma } from "../db.js";
import { sendOrderNotification } from "./push.js";

export const ordersRouter = Router();

// GET /api/orders
ordersRouter.get("/", async (_req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/orders/:id
ordersRouter.get("/:id", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!order) return res.status(404).json({ error: "Not found" });
    res.json(order);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/orders  { customerName, phone, address, city, notes?, items: [{productId, quantity, price, size?, color?}] }
ordersRouter.post("/", async (req, res) => {
  try {
    const { customerName, phone, address, city, notes, items } = req.body;
    if (!items?.length)
      return res.status(400).json({ error: "No items" });

    // Validate that each productId actually exists in the database
    const productIds: string[] = items.map((it: any) => it.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    const validIds = new Set(existingProducts.map((p) => p.id));
    const invalidIds = productIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: `بعض المنتجات في السلة غير موجودة أو تم حذفها. يرجى تفريغ السلة وإضافة المنتجات من جديد.\nInvalid product IDs: ${invalidIds.join(", ")}`,
      });
    }

    const subtotal = items.reduce(
      (sum: number, it: any) => sum + it.price * it.quantity,
      0
    );
    const shipping = 5000;
    const total = subtotal + shipping;

    const order = await prisma.order.create({
      data: {
        customerName,
        phone,
        address,
        city,
        notes,
        subtotal,
        shipping,
        total,
        items: {
          create: items.map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price,
            size: it.size,
            color: it.color,
          })),
        },
      },
      include: { items: true },
    });

    // 🔔 Send push notification to admin (works even when site is closed)
    sendOrderNotification({
      id: order.id,
      customerName: order.customerName,
      phone: order.phone,
      city: order.city,
      total: order.total,
    }).catch(() => {}); // never block response

    res.status(201).json(order);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /api/orders/:id  (update status)
ordersRouter.patch("/:id", async (req, res) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json(order);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});
