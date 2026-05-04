import { Router } from "express";
import multer from "multer";
import crypto from "node:crypto";
import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { requireAdmin } from "../auth.js";

export const uploadRouter = Router();

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const BUCKET = process.env.R2_BUCKET || "";
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID || "";
const SECRET = process.env.R2_SECRET_ACCESS_KEY || "";
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");

const s3 =
  ACCOUNT_ID && ACCESS_KEY && SECRET
    ? new S3Client({
        region: "auto",
        endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET },
      })
    : null;

// 8MB per file in memory before pushing to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

uploadRouter.post(
  "/image",
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!s3 || !BUCKET || !PUBLIC_URL) {
        return res.status(503).json({ error: "R2 not configured" });
      }
      const file = req.file;
      if (!file) return res.status(400).json({ error: "no file" });
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "not an image" });
      }

      const ext = (file.originalname.split(".").pop() || "jpg")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 5);
      const key = `products/${Date.now()}-${crypto
        .randomBytes(6)
        .toString("hex")}.${ext || "jpg"}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          CacheControl: "public, max-age=31536000, immutable",
        })
      );

      res.json({ url: `${PUBLIC_URL}/${key}`, key });
    } catch (e: any) {
      console.error("R2 upload error:", e);
      res.status(500).json({ error: e?.message || "upload failed" });
    }
  }
);

/** Extract R2 key from a full URL or return the input if already a key */
export function extractKey(urlOrKey: string): string | null {
  if (!urlOrKey) return null;
  if (PUBLIC_URL && urlOrKey.startsWith(PUBLIC_URL + "/")) {
    return urlOrKey.slice(PUBLIC_URL.length + 1);
  }
  // Allow callers to pass plain keys directly
  if (!urlOrKey.startsWith("http")) return urlOrKey;
  return null;
}

/** Delete one or many R2 objects. Never throws (best-effort). */
export async function deleteR2Objects(urlsOrKeys: string[]): Promise<void> {
  if (!s3 || !BUCKET) return;
  const keys = urlsOrKeys
    .map((u) => extractKey(u))
    .filter((k): k is string => Boolean(k));
  if (keys.length === 0) return;
  try {
    if (keys.length === 1) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: keys[0] }));
    } else {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: BUCKET,
          Delete: { Objects: keys.map((Key) => ({ Key })) },
        })
      );
    }
  } catch (e) {
    console.warn("R2 delete failed (ignored):", e);
  }
}

// DELETE /api/upload/image — body: { urls: string[] } or { keys: string[] }
uploadRouter.post("/delete", requireAdmin, async (req, res) => {
  try {
    const list: string[] = [
      ...(Array.isArray(req.body?.urls) ? req.body.urls : []),
      ...(Array.isArray(req.body?.keys) ? req.body.keys : []),
    ];
    await deleteR2Objects(list);
    res.json({ ok: true, deleted: list.length });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "delete failed" });
  }
});
