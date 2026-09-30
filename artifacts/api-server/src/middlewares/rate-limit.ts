import type { RequestHandler } from "express";

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60 * 60 * 1000);
const maxRequests = Number(process.env.RATE_LIMIT_MAX ?? 5);
const buckets = new Map<string, { startedAt: number; count: number }>();

export const advisoryRateLimit: RequestHandler = (req, res, next) => {
  const key = req.currentUser?.id ?? req.ip ?? "anonymous";
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    buckets.set(key, { startedAt: now, count: 1 });
    next();
    return;
  }
  if (current.count >= maxRequests) {
    res.status(429).json({ error: "You have reached the advisory limit for this hour. Try again later." });
    return;
  }
  current.count += 1;
  next();
};