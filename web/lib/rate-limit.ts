import { Request, Response, NextFunction } from "express";

/**
 * Fixed-window per-IP limiter for the public REST API.
 *
 * The ceiling is deliberately generous — reads are served from an in-memory
 * registry, so this exists to keep one runaway client from starving the origin,
 * not to meter access. Every response carries the RateLimit headers (both the
 * structured field and the older discrete form) so an agent can self-throttle
 * instead of discovering the limit by hitting a 429.
 */
export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  policyName: string;
  maxEntries: number;
}

export const API_RATE_LIMIT: RateLimitOptions = {
  limit: 600,
  windowMs: 60_000,
  policyName: "api",
  maxEntries: 50_000,
};

export function createRateLimiter(opts: RateLimitOptions = API_RATE_LIMIT) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  // Bounded memory: drop expired windows hourly, and hard-cap if a flood outruns that.
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of windows) {
      if (now > entry.resetAt) windows.delete(ip);
    }
    if (windows.size > opts.maxEntries) {
      const oldestFirst = [...windows.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
      for (const [ip] of oldestFirst.slice(0, windows.size - opts.maxEntries)) {
        windows.delete(ip);
      }
    }
  }, 60 * 60 * 1000);
  timer.unref?.();

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    let entry = windows.get(ip);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + opts.windowMs };
      windows.set(ip, entry);
    }
    entry.count++;

    const resetSeconds = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
    const remaining = Math.max(0, opts.limit - entry.count);

    res.set("RateLimit-Policy", `"${opts.policyName}";q=${opts.limit};w=${opts.windowMs / 1000}`);
    res.set("RateLimit", `"${opts.policyName}";r=${remaining};t=${resetSeconds}`);
    // Discrete headers for clients that predate the structured field.
    res.set("RateLimit-Limit", String(opts.limit));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(resetSeconds));

    if (entry.count > opts.limit) {
      res.set("Retry-After", String(resetSeconds));
      res.status(429).json({
        error: `Rate limit exceeded: ${opts.limit} requests per ${opts.windowMs / 1000}s. Retry in ${resetSeconds}s.`,
      });
      return;
    }

    next();
  };
}
