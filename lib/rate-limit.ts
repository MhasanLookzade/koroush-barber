/**
 * Koroush Barber — Memory Rate Limiter & Security Guard
 * Prevents brute force and enumeration on sensitive endpoints
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired records periodically without keeping Node event loop alive
const cleanupTimer = setInterval(() => {
  const now = Date.now()
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  })
}, 60000)
if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref()
}

export function checkRateLimit(
  key: string,
  limit: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count += 1
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

export function getClientIp(req: Request): string {
  // Prefer X-Real-IP set directly by trusted Nginx ($remote_addr) to prevent XFF spoofing
  const realIp = req.headers.get("x-real-ip")?.trim()
  if (realIp) {
    return realIp
  }
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    const hops = forwarded.split(",").map((s) => s.trim()).filter(Boolean)
    if (hops.length > 0) {
      return hops[hops.length - 1]
    }
  }
  return "127.0.0.1"
}
