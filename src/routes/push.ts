import { Router } from "express";
import webpush from "web-push";

export const pushRouter = Router();

// In-memory store for subscriptions (persists as long as server runs)
// For production, store in DB
const subscriptions: webpush.PushSubscription[] = [];

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@aurax.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// GET /api/push/vapid-public-key — return public key to frontend
pushRouter.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save subscription
pushRouter.post("/subscribe", (req, res) => {
  const subscription = req.body as webpush.PushSubscription;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  // Avoid duplicates
  const exists = subscriptions.some((s) => s.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log(`✅ Push subscription saved (total: ${subscriptions.length})`);
  }
  res.status(201).json({ ok: true });
});

// POST /api/push/unsubscribe — remove subscription
pushRouter.post("/unsubscribe", (req, res) => {
  const { endpoint } = req.body;
  const idx = subscriptions.findIndex((s) => s.endpoint === endpoint);
  if (idx !== -1) subscriptions.splice(idx, 1);
  res.json({ ok: true });
});

// POST /api/push/test — send a real web push to all subscriptions (debug)
pushRouter.post("/test", async (_req, res) => {
  if (subscriptions.length === 0) {
    return res.status(400).json({ ok: false, error: "لا يوجد أي اشتراك مفعّل" });
  }
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, error: "VAPID keys غير مضبوطة على السيرفر" });
  }

  const payload = JSON.stringify({
    title: "🔔 اختبار AURAX",
    body: "Web Push يعمل! هذا إشعار حقيقي عبر السيرفر.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "test-push",
    data: { url: "/admin" },
  });

  const dead: string[] = [];
  let sent = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.endpoint);
        } else {
          errors.push(`${err.statusCode || "?"}: ${err.body || err.message}`);
        }
      }
    })
  );

  dead.forEach((ep) => {
    const i = subscriptions.findIndex((s) => s.endpoint === ep);
    if (i !== -1) subscriptions.splice(i, 1);
  });

  if (sent === 0) {
    return res.status(500).json({
      ok: false,
      error: errors[0] || "فشل إرسال الإشعار لكل الاشتراكات",
      removedDead: dead.length,
    });
  }

  res.json({ ok: true, sent, removedDead: dead.length });
});

// Internal helper — called by orders route when a new order arrives
export async function sendOrderNotification(order: {
  id: string;
  customerName: string;
  phone: string;
  city: string;
  total: number;
}) {
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: "🛒 طلب جديد — AURAX",
    body: `${order.customerName} · ${order.city}\nالمجموع: ${order.total.toLocaleString("en-US")} د.ع`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: `order-${order.id}`,
    data: { url: "/admin" },
  });

  const dead: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, payload);
      } catch (err: any) {
        // 410 = subscription expired/unsubscribed
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.endpoint);
        }
      }
    })
  );

  // Remove dead subscriptions
  dead.forEach((ep) => {
    const i = subscriptions.findIndex((s) => s.endpoint === ep);
    if (i !== -1) subscriptions.splice(i, 1);
  });
}
