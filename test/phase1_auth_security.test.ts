import Module from "module"
import path from "path"

const origResolve = (Module as unknown as { _resolveFilename: (...args: unknown[]) => string })._resolveFilename
;(Module as unknown as { _resolveFilename: (req: string, ...rest: unknown[]) => string })._resolveFilename = function (
  request: string,
  ...rest: unknown[]
) {
  if (request.startsWith("@/")) {
    return origResolve.call(this, path.join(process.cwd(), request.slice(2)), ...rest)
  }
  return origResolve.call(this, request, ...rest)
}

import assert from "assert"
import crypto from "crypto"
import { NextRequest } from "next/server"
import {
  signAdminToken,
  verifyAdminToken,
  signCustomerToken,
  verifyCustomerToken,
  getAuthSecret,
} from "../lib/auth"
import { verifyAdminTokenEdge } from "../lib/edge-auth"
import { authorizeAdmin } from "../lib/admin-auth"
import { authorizeCustomer, CUSTOMER_COOKIE_NAME } from "../lib/customer-auth"
import { POST as customerLogout } from "../app/api/auth/customer/logout/route"
import { POST as adminLogout } from "../app/api/admin/auth/logout/route"
import { POST as legacyLogout } from "../app/api/auth/logout/route"
import { GET as getCustomerMe } from "../app/api/auth/customer/me/route"
import { GET as getCustomerAppointments } from "../app/api/customer/appointments/route"

let passed = 0
let failed = 0

function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name} ->`, err instanceof Error ? err.message : err)
    failed++
  }
}

async function checkAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`  ✅ [PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name} ->`, err instanceof Error ? err.message : err)
    failed++
  }
}

function makeSignedCustom(payload: object, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url")
  return `${data}.${sig}`
}

async function run() {
  console.log("==================================================================")
  console.log("  PHASE 1 — AUTHENTICATION & SESSION SECURITY REGRESSION SUITE")
  console.log("==================================================================")

  // 1. Valid customer session
  const custToken = signCustomerToken({
    customerId: "cust_abc_123",
    phone: "09121112233",
    name: "علی رضایی",
  })

  check("Valid customer session token verifies cleanly", () => {
    const decoded = verifyCustomerToken(custToken)
    assert(decoded !== null)
    assert.strictEqual(decoded.customerId, "cust_abc_123")
    assert.strictEqual(decoded.tokenType, "customer")
  })

  // 2. Invalid customer signature
  check("Invalid customer signature is rejected", () => {
    const [data] = custToken.split(".")
    assert.strictEqual(verifyCustomerToken(`${data}.tampered_sig`), null)
  })

  // 3. Modified customer ID in payload without re-signing
  check("Modified customer ID (tampered payload) is rejected", () => {
    const [, sig] = custToken.split(".")
    const modifiedPayload = Buffer.from(
      JSON.stringify({
        customerId: "cust_victim_999",
        phone: "09129998877",
        name: "Victim",
        tokenType: "customer",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64url")
    assert.strictEqual(verifyCustomerToken(`${modifiedPayload}.${sig}`), null)
  })

  // 4. Raw unsigned customer ID (legacy SEC-001 exploit) rejected
  await checkAsync("Raw unsigned customer_auth cookie is rejected with 401 on /api/auth/customer/me & /api/customer/appointments", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/auth/customer/me", {
      headers: { cookie: `${CUSTOMER_COOKIE_NAME}=cust_victim_999` },
    })
    const res1 = await getCustomerMe(req1)
    assert.strictEqual(res1.status, 401)

    const req2 = new NextRequest("http://localhost:3000/api/customer/appointments", {
      headers: { cookie: `${CUSTOMER_COOKIE_NAME}=cust_victim_999` },
    })
    const res2 = await getCustomerAppointments(req2)
    assert.strictEqual(res2.status, 401)
  })

  // 5. Expired customer session
  check("Expired customer session token is rejected", () => {
    const expired = makeSignedCustom(
      {
        customerId: "cust_1",
        phone: "09120000000",
        name: "Test",
        tokenType: "customer",
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      getAuthSecret("customer")
    )
    assert.strictEqual(verifyCustomerToken(expired), null)
  })

  // 6. Missing session
  check("Missing customer session returns 401 from authorizeCustomer", () => {
    const req = new NextRequest("http://localhost:3000/api/customer/profile")
    const auth = authorizeCustomer(req)
    assert("errorResponse" in auth)
    assert.strictEqual(auth.errorResponse.status, 401)
  })

  // 7. Cross-customer access prevention (token binds strictly to signed customerId)
  check("Customer token strictly binds session.customerId to authenticated user", () => {
    const req = new NextRequest("http://localhost:3000/api/customer/appointments", {
      headers: { cookie: `${CUSTOMER_COOKIE_NAME}=${custToken}` },
    })
    const auth = authorizeCustomer(req)
    assert("session" in auth)
    assert.strictEqual(auth.session.customerId, "cust_abc_123")
    assert.notStrictEqual(auth.session.customerId, "cust_victim_999")
  })

  // 8. Valid admin session (Node + Edge parity)
  const ownerToken = signAdminToken({
    userId: "admin_owner_1",
    username: "admin",
    name: "Koroush",
    role: "OWNER",
  })
  const staffToken = signAdminToken({
    userId: "admin_staff_1",
    username: "staff",
    name: "Staff",
    role: "STAFF",
  })

  await checkAsync("Valid admin token verifies in both Node (verifyAdminToken) and Edge (verifyAdminTokenEdge)", async () => {
    const nodeRes = verifyAdminToken(ownerToken)
    const edgeRes = await verifyAdminTokenEdge(ownerToken)
    assert(nodeRes !== null && edgeRes !== null)
    assert.strictEqual(nodeRes.userId, edgeRes.userId)
    assert.strictEqual(nodeRes.role, "OWNER")
    assert.strictEqual(edgeRes.role, "OWNER")
  })

  // 9. Invalid & expired admin sessions
  await checkAsync("Invalid & expired admin tokens rejected in both Node and Edge", async () => {
    assert.strictEqual(verifyAdminToken("invalid.token"), null)
    assert.strictEqual(await verifyAdminTokenEdge("invalid.token"), null)
    assert.strictEqual(verifyAdminToken("true"), null)
    assert.strictEqual(await verifyAdminTokenEdge("true"), null)

    const expiredAdmin = makeSignedCustom(
      {
        userId: "admin_1",
        username: "admin",
        name: "Admin",
        role: "OWNER",
        tokenType: "admin",
        exp: Math.floor(Date.now() / 1000) - 10,
      },
      getAuthSecret("admin")
    )
    assert.strictEqual(verifyAdminToken(expiredAdmin), null)
    assert.strictEqual(await verifyAdminTokenEdge(expiredAdmin), null)
  })

  // 10. Token type separation (customer token cannot pass as admin and vice versa)
  await checkAsync("Customer token cannot be accepted as Admin token and Admin token cannot pass as Customer token", async () => {
    assert.strictEqual(verifyAdminToken(custToken), null)
    assert.strictEqual(await verifyAdminTokenEdge(custToken), null)
    assert.strictEqual(verifyCustomerToken(ownerToken), null)
  })

  // 11. RBAC: STAFF vs OWNER
  check("STAFF attempting OWNER-only route receives 403; OWNER receives session", () => {
    const staffReq = new NextRequest("http://localhost:3000/api/admin/settings", {
      headers: { cookie: `admin_token=${staffToken}` },
    })
    const staffAuth = authorizeAdmin(staffReq, "OWNER")
    assert("errorResponse" in staffAuth)
    assert.strictEqual(staffAuth.errorResponse.status, 403)

    const ownerReq = new NextRequest("http://localhost:3000/api/admin/settings", {
      headers: { cookie: `admin_token=${ownerToken}` },
    })
    const ownerAuth = authorizeAdmin(ownerReq, "OWNER")
    assert("session" in ownerAuth)
    assert.strictEqual(ownerAuth.session.role, "OWNER")
  })

  // 12. Logout cookie invalidation
  await checkAsync("Logout endpoints clear customer_auth, admin_token, and admin_auth cookies", async () => {
    const cRes = await customerLogout(new NextRequest("http://localhost:3000/api/auth/customer/logout", { method: "POST" }))
    assert(cRes.headers.get("set-cookie")?.includes("customer_auth=;"))

    const aRes = await adminLogout()
    const aCookies = aRes.headers.getSetCookie ? aRes.headers.getSetCookie().join(";") : aRes.headers.get("set-cookie") || ""
    assert(aCookies.includes("admin_token=;") && aCookies.includes("admin_auth=;"))

    const lRes = await legacyLogout()
    const lCookies = lRes.headers.getSetCookie ? lRes.headers.getSetCookie().join(";") : lRes.headers.get("set-cookie") || ""
    assert(lCookies.includes("admin_token=;") && lCookies.includes("admin_auth=;"))
  })

  // 13 & 14. Missing / insecure fallback secrets rejected in production
  check("Production mode rejects missing secrets and known insecure fallback secrets", () => {
    const prevEnv = process.env.NODE_ENV
    const prevAdmin = process.env.ADMIN_JWT_SECRET
    const prevNext = process.env.NEXTAUTH_SECRET
    const prevPhase = process.env.NEXT_PHASE
    try {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = "production"
      delete process.env.NEXT_PHASE
      delete process.env.ADMIN_JWT_SECRET
      delete process.env.NEXTAUTH_SECRET

      assert.throws(() => getAuthSecret("admin"), /must be configured in production/)

      process.env.ADMIN_JWT_SECRET = "koroush-barber-luxury-secret-key-2026"
      assert.throws(() => getAuthSecret("admin"), /insecure default/)

      process.env.ADMIN_JWT_SECRET = "short_secret"
      assert.throws(() => getAuthSecret("admin"), /at least 32 characters/)

      process.env.ADMIN_JWT_SECRET = "a_very_strong_random_secret_over_32_characters_long_2026"
      assert.strictEqual(getAuthSecret("admin"), "a_very_strong_random_secret_over_32_characters_long_2026")
    } finally {
      ;(process.env as Record<string, string | undefined>).NODE_ENV = prevEnv
      if (prevAdmin !== undefined) process.env.ADMIN_JWT_SECRET = prevAdmin
      else delete process.env.ADMIN_JWT_SECRET
      if (prevNext !== undefined) process.env.NEXTAUTH_SECRET = prevNext
      else delete process.env.NEXTAUTH_SECRET
      if (prevPhase !== undefined) process.env.NEXT_PHASE = prevPhase
      else delete process.env.NEXT_PHASE
    }
  })

  console.log("==================================================================")
  console.log(`  PHASE 1 SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
