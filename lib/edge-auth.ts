/**
 * Edge-compatible authentication utilities for Next.js Middleware.
 * Uses standard Web Crypto API (crypto.subtle) without any Node.js dependencies.
 */

export interface AdminSession {
  userId: string
  username: string
  name: string
  role: "OWNER" | "STAFF"
  exp: number
}

const AUTH_SECRET =
  process.env.ADMIN_JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "koroush-barber-luxury-secret-key-2026"

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
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )

    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data))
    const expectedSig = arrayBufferToBase64Url(sigBuffer)

    if (expectedSig !== signature) {
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
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null // Expired
    }

    return payload
  } catch {
    return null
  }
}
