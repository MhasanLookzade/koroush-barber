import bcrypt from "bcryptjs"
import crypto from "crypto"

export interface AdminSession {
  userId: string
  username: string
  name: string
  role: "OWNER" | "STAFF"
  tokenType?: "admin"
  exp: number
}

export interface CustomerSession {
  customerId: string
  phone: string
  name: string
  tokenType?: "customer"
  exp: number
}

const INSECURE_FALLBACK_SECRETS = new Set([
  "koroush-barber-luxury-secret-key-2026",
  "koroush_jwt_secret_production_2026_super_secure",
  "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32",
])

const DEV_EPHEMERAL_SECRET = "koroush-barber-dev-only-local-ephemeral-secret"

/**
 * Validate and resolve the authentication secret.
 * In production runtime, fails closed if the secret is missing, too short, or a known insecure default.
 */
export function getAuthSecret(purpose: "admin" | "customer" = "admin"): string {
  const rawSecret =
    purpose === "customer"
      ? process.env.CUSTOMER_JWT_SECRET || process.env.ADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET
      : process.env.ADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET

  const trimmed = rawSecret?.trim() || ""
  const isProdRuntime =
    process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build"

  if (trimmed) {
    if (isProdRuntime && INSECURE_FALLBACK_SECRETS.has(trimmed)) {
      throw new Error("SECURITY CONFIG ERROR: Authentication secret uses a known insecure default value.")
    }
    if (isProdRuntime && trimmed.length < 32) {
      throw new Error("SECURITY CONFIG ERROR: Authentication secret must be at least 32 characters in production.")
    }
    return trimmed
  }

  if (isProdRuntime) {
    throw new Error("SECURITY CONFIG ERROR: ADMIN_JWT_SECRET (or NEXTAUTH_SECRET) must be configured in production.")
  }

  return DEV_EPHEMERAL_SECRET
}

export function validateAuthSecretConfig(): void {
  getAuthSecret("admin")
}

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8")
  const bufB = Buffer.from(b, "utf8")
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function signPayload(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url")
  return `${data}.${signature}`
}

function verifyPayload<T extends { exp: number }>(token: string, secret: string): T | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [data, signature] = parts
  if (!data || !signature) return null

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url")

  if (!timingSafeMatch(signature, expectedSignature)) return null

  try {
    const session: T = JSON.parse(Buffer.from(data, "base64url").toString("utf-8"))
    if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return session
  } catch {
    return null
  }
}

/**
 * Generate secure HMAC-signed admin token
 */
export function signAdminToken(payload: Omit<AdminSession, "exp" | "tokenType">): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600 // 7 days validity
  const session: AdminSession = { ...payload, tokenType: "admin", exp }
  return signPayload(session, getAuthSecret("admin"))
}

/**
 * Verify and decode admin session token
 */
export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const session = verifyPayload<AdminSession>(token, getAuthSecret("admin"))
    if (!session) return null
    if (session.tokenType && session.tokenType !== "admin") return null
    if (!session.userId || !session.role) return null
    return session
  } catch {
    return null
  }
}

/**
 * Generate secure HMAC-signed customer session token
 */
export function signCustomerToken(payload: Omit<CustomerSession, "exp" | "tokenType">): string {
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 3600 // 30 days validity
  const session: CustomerSession = { ...payload, tokenType: "customer", exp }
  return signPayload(session, getAuthSecret("customer"))
}

/**
 * Verify and decode customer session token
 */
export function verifyCustomerToken(token: string): CustomerSession | null {
  try {
    const session = verifyPayload<CustomerSession>(token, getAuthSecret("customer"))
    if (!session) return null
    if (session.tokenType !== "customer") return null
    if (!session.customerId) return null
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
    .createHmac("sha256", getAuthSecret("admin"))
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

/**
 * Mask Iranian phone number for safe display (anti-scraping)
 * e.g. "09123456789" -> "0912***6789"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone
  return phone.slice(0, 4) + "***" + phone.slice(-4)
}

/**
 * Mask customer name for privacy in public status responses
 * e.g. "علیرضا محمدی" -> "علیرضا م***"
 */
export function maskCustomerName(name: string): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    const n = parts[0]
    return n.length > 2 ? n[0] + "***" + n.slice(-1) : n[0] + "*"
  }
  return parts[0] + " " + parts.slice(1).map((p) => (p.length > 0 ? p[0] + "***" : "")).join(" ")
}
