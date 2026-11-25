/**
 * Edge-compatible authentication utilities for Next.js Middleware.
 * Uses standard Web Crypto API (crypto.subtle) without any Node.js dependencies.
 */

export interface AdminSession {
  userId: string
  username: string
  name: string
  role: "OWNER" | "STAFF"
  tokenType?: "admin"
  exp: number
}

const INSECURE_FALLBACK_SECRETS = new Set([
  "koroush-barber-luxury-secret-key-2026",
  "koroush_jwt_secret_production_2026_super_secure",
  "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32",
])

const DEV_EPHEMERAL_SECRET = "koroush-barber-dev-only-local-ephemeral-secret"

function getEdgeAuthSecret(): string {
  const rawSecret = process.env.ADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET
  const trimmed = rawSecret?.trim() || ""
  const isProdRuntime =
    process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build"

  if (trimmed) {
    if (isProdRuntime && (INSECURE_FALLBACK_SECRETS.has(trimmed) || trimmed.length < 32)) {
      throw new Error("SECURITY CONFIG ERROR: Invalid production authentication secret.")
    }
    return trimmed
  }

  if (isProdRuntime) {
    throw new Error("SECURITY CONFIG ERROR: ADMIN_JWT_SECRET must be configured in production.")
  }

  return DEV_EPHEMERAL_SECRET
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/**
 * Verify HMAC-SHA256 admin token in Edge runtime
 */
export async function verifyAdminTokenEdge(token: string): Promise<AdminSession | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null
  }

  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [data, signature] = parts

  try {
    const secret = getEdgeAuthSecret()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
    const expectedSig = arrayBufferToBase64Url(sigBuffer)

    if (!constantTimeEqual(expectedSig, signature)) {
      return null
    }

    const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(padded), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )

    const payload = JSON.parse(jsonStr) as AdminSession
    if (payload.tokenType && payload.tokenType !== "admin") {
      return null
    }
    if (!payload.userId || !payload.role) {
      return null
    }
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Expired
    }

    return payload
  } catch {
    return null
  }
}
