import bcrypt from "bcryptjs"
import crypto from "crypto"

export interface AdminSession {
  userId: string
  username: string
  name: string
  role: "OWNER" | "STAFF"
  exp: number
}

const AUTH_SECRET = process.env.ADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET || "koroush-barber-luxury-secret-key-2026"

/**
 * Generate secure HMAC-signed admin token
 */
export function signAdminToken(payload: Omit<AdminSession, "exp">): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600 // 7 days validity
  const session: AdminSession = { ...payload, exp }
  const data = Buffer.from(JSON.stringify(session)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url")
  return `${data}.${signature}`
}

/**
 * Verify and decode admin session token
 */
export function verifyAdminToken(token: string): AdminSession | null {
  if (!token || !token.includes(".")) return null
  const [data, signature] = token.split(".")
  const expectedSignature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(data)
    .digest("base64url")
  
  if (signature !== expectedSignature) return null

  try {
    const session: AdminSession = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"))
    if (session.exp < Math.floor(Date.now() / 1000)) return null // Expired
    return session
  } catch {
    return null
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Compare password with hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Hash OTP code for safe database storage (never store plain OTPs)
 */
export function hashOtpCode(code: string, phone: string): string {
  return crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${phone}:${code}`)
    .digest("hex")
}

/**
 * Generate a random 6-digit OTP
 */
export function generateOtpCode(): string {
  return Math.floor(100000 + crypto.randomInt(900000)).toString()
}

/**
 * Generate human-readable booking tracking code
 * e.g. "KB-84920"
 */
export function generateTrackingCode(): string {
  const num = Math.floor(10000 + crypto.randomInt(90000))
  return `KB-${num}`
}
