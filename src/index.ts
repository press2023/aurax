import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { ordersRouter } from "./routes/orders.js";
import { authRouter } from "./routes/auth.js";
import { uploadRouter } from "./routes/upload.js";
import { pushRouter } from "./routes/push.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// Support: "*", single origin, or comma-separated list.
// Also auto-allow any *.pages.dev subdomain for Cloudflare preview deploys.
const allowedOrigins = CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (CORS_ORIGIN === "*") return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      // Allow all Cloudflare Pages subdomains of our project
      if (/\.pages\.dev$/.test(new URL(origin).hostname)) {
        return cb(null, true);
      }
      cb(new Error(`CORS blocked: ${origin}`));
    },
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) => {
  res.json({ name: "aurax-api", status: "ok" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/push", pushRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AURAX API listening on :${PORT}`);
});
