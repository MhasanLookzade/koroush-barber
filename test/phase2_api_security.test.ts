import Module from "module"
import path from "path"
import fs from "fs"

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
import { NextRequest } from "next/server"
import { signAdminToken, signCustomerToken } from "../lib/auth"
import { getClientIp } from "../lib/rate-limit"
import { GET as getAppointments, POST as postAppointment } from "../app/api/appointments/route"
import { GET as getAppointmentById, PUT as putAppointmentById, DELETE as deleteAppointmentById } from "../app/api/appointments/[id]/route"
import { GET as getBarbers, POST as postBarber } from "../app/api/barbers/route"
import { GET as getBarberById, PUT as putBarberById, DELETE as deleteBarberById } from "../app/api/barbers/[id]/route"
import { GET as getServices, POST as postService } from "../app/api/services/route"
import { GET as getServiceById, PUT as putServiceById, DELETE as deleteServiceById } from "../app/api/services/[id]/route"
import { POST as sendOtp } from "../app/api/booking/otp/send/route"
import { POST as cancelBooking } from "../app/api/booking/cancel/route"

let passed = 0
let failed = 0

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

async function run() {
  console.log("==================================================================")
  console.log("  PHASE 2 — API SECURITY, RBAC, OTP & CREDENTIAL GUARD SUITE")
  console.log("==================================================================")

  const ownerToken = signAdminToken({ userId: "adm_owner", username: "admin", name: "Owner", role: "OWNER" })
  const staffToken = signAdminToken({ userId: "adm_staff", username: "staff", name: "Staff", role: "STAFF" })
  const custToken = signCustomerToken({ customerId: "cust_1", phone: "09121112233", name: "Customer" })

  // 1. Unauthenticated requests to protected endpoints -> 401
  await checkAsync("Unauthenticated requests to /api/appointments* and mutations on /api/barbers* & /api/services* return 401", async () => {
    assert.strictEqual((await getAppointments(new NextRequest("http://localhost:3000/api/appointments"))).status, 401)
    assert.strictEqual((await postAppointment(new NextRequest("http://localhost:3000/api/appointments", { method: "POST", body: "{}" }))).status, 401)
    assert.strictEqual((await getAppointmentById(new NextRequest("http://localhost:3000/api/appointments/x"), { params: Promise.resolve({ id: "x" }) })).status, 401)
    assert.strictEqual((await putAppointmentById(new NextRequest("http://localhost:3000/api/appointments/x", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "x" }) })).status, 401)
    assert.strictEqual((await deleteAppointmentById(new NextRequest("http://localhost:3000/api/appointments/x", { method: "DELETE" }), { params: Promise.resolve({ id: "x" }) })).status, 401)

    assert.strictEqual((await postBarber(new NextRequest("http://localhost:3000/api/barbers", { method: "POST", body: "{}" }))).status, 401)
    assert.strictEqual((await putBarberById(new NextRequest("http://localhost:3000/api/barbers/x", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "x" }) })).status, 401)
    assert.strictEqual((await deleteBarberById(new NextRequest("http://localhost:3000/api/barbers/x", { method: "DELETE" }), { params: Promise.resolve({ id: "x" }) })).status, 401)

    assert.strictEqual((await postService(new NextRequest("http://localhost:3000/api/services", { method: "POST", body: "{}" }))).status, 401)
    assert.strictEqual((await putServiceById(new NextRequest("http://localhost:3000/api/services/x", { method: "PUT", body: "{}" }), { params: Promise.resolve({ id: "x" }) })).status, 401)
    assert.strictEqual((await deleteServiceById(new NextRequest("http://localhost:3000/api/services/x", { method: "DELETE" }), { params: Promise.resolve({ id: "x" }) })).status, 401)
  })

  // 2. Customer token rejected on protected admin/legacy endpoints -> 401
  await checkAsync("Authenticated customer token is rejected (401) on /api/appointments and OWNER mutations", async () => {
    const custHeaders = { cookie: `admin_token=${custToken}` }
    assert.strictEqual((await getAppointments(new NextRequest("http://localhost:3000/api/appointments", { headers: custHeaders }))).status, 401)
    assert.strictEqual((await postService(new NextRequest("http://localhost:3000/api/services", { method: "POST", headers: custHeaders, body: "{}" }))).status, 401)
  })

  // 3. STAFF vs OWNER permissions
  await checkAsync("STAFF can read /api/appointments (200) but receives 403 on OWNER-only DELETE & service/barber mutations", async () => {
    const staffHeaders = { cookie: `admin_token=${staffToken}` }
    assert.strictEqual((await getAppointments(new NextRequest("http://localhost:3000/api/appointments", { headers: staffHeaders }))).status, 200)
    assert.strictEqual((await deleteAppointmentById(new NextRequest("http://localhost:3000/api/appointments/x", { method: "DELETE", headers: staffHeaders }), { params: Promise.resolve({ id: "x" }) })).status, 403)
    assert.strictEqual((await postBarber(new NextRequest("http://localhost:3000/api/barbers", { method: "POST", headers: staffHeaders, body: "{}" }))).status, 403)
    assert.strictEqual((await putBarberById(new NextRequest("http://localhost:3000/api/barbers/x", { method: "PUT", headers: staffHeaders, body: "{}" }), { params: Promise.resolve({ id: "x" }) })).status, 403)
    assert.strictEqual((await deleteBarberById(new NextRequest("http://localhost:3000/api/barbers/x", { method: "DELETE", headers: staffHeaders }), { params: Promise.resolve({ id: "x" }) })).status, 403)
    assert.strictEqual((await postService(new NextRequest("http://localhost:3000/api/services", { method: "POST", headers: staffHeaders, body: "{}" }))).status, 403)
    assert.strictEqual((await putServiceById(new NextRequest("http://localhost:3000/api/services/x", { method: "PUT", headers: staffHeaders, body: "{}" }), { params: Promise.resolve({ id: "x" }) })).status, 403)
    assert.strictEqual((await deleteServiceById(new NextRequest("http://localhost:3000/api/services/x", { method: "DELETE", headers: staffHeaders }), { params: Promise.resolve({ id: "x" }) })).status, 403)
  })

  // 4. Public GET barbers/services compatibility & PII protection
  await checkAsync("Public GET /api/barbers & /api/barbers/[id] work (200) and strip email, phone, and appointments", async () => {
    const resList = await getBarbers(new NextRequest("http://localhost:3000/api/barbers"))
    assert.strictEqual(resList.status, 200)
    const barbers = await resList.json()
    assert(Array.isArray(barbers) && barbers.length > 0)
    assert.strictEqual(barbers[0].email, undefined)
    assert.strictEqual(barbers[0].phone, undefined)

    const resOne = await getBarberById(new NextRequest(`http://localhost:3000/api/barbers/${barbers[0].id}`), {
      params: Promise.resolve({ id: barbers[0].id }),
    })
    assert.strictEqual(resOne.status, 200)
    const one = await resOne.json()
    assert.strictEqual(one.appointments, undefined)
    assert.strictEqual(one.email, undefined)
    assert.strictEqual(one.phone, undefined)

    const resSrvList = await getServices()
    assert.strictEqual(resSrvList.status, 200)
    const srvs = await resSrvList.json()
    assert(Array.isArray(srvs) && srvs.length > 0)

    const resSrvOne = await getServiceById(new NextRequest(`http://localhost:3000/api/services/${srvs[0].id}`), {
      params: Promise.resolve({ id: srvs[0].id }),
    })
    assert.strictEqual(resSrvOne.status, 200)
  })

  // 5. OWNER receives full barber details
  await checkAsync("OWNER GET /api/barbers/[id] receives admin fields (email/phone/appointments)", async () => {
    const ownerHeaders = { cookie: `admin_token=${ownerToken}` }
    const res = await getBarberById(new NextRequest("http://localhost:3000/api/barbers/barber-kourosh", { headers: ownerHeaders }), {
      params: Promise.resolve({ id: "barber-kourosh" }),
    })
    assert.strictEqual(res.status, 200)
    const data = await res.json()
    assert(Array.isArray(data.appointments))
  })

  // 6. getClientIp anti-spoofing check
  check("getClientIp prefers trusted x-real-ip and rightmost x-forwarded-for hop", () => {
    const spoofed = new NextRequest("http://localhost:3000/api/booking/otp/send", {
      headers: { "x-forwarded-for": "9.9.9.9, 203.0.113.5", "x-real-ip": "203.0.113.5" },
    })
    assert.strictEqual(getClientIp(spoofed), "203.0.113.5")

    const xffOnly = new NextRequest("http://localhost:3000/api/booking/otp/send", {
      headers: { "x-forwarded-for": "1.2.3.4, 198.51.100.7" },
    })
    assert.strictEqual(getClientIp(xffOnly), "198.51.100.7")
  })

  // 7. OTP IP rate limiting (max 5 per IP per 10m across distinct invalid/valid phones)
  await checkAsync("OTP send endpoint enforces IP rate limit (429 on 6th request)", async () => {
    const testIp = `198.51.100.${Math.floor(10 + Math.random() * 200)}`
    for (let i = 1; i <= 5; i++) {
      const req = new NextRequest("http://localhost:3000/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": testIp },
        body: JSON.stringify({ phone: `0999000000${i}` }), // distinct invalid-ish valid-format phones? Wait: use 0912... to pass phone check without hitting DB? No, let's check invalid phone: IP limit runs BEFORE phone check!
      })
      const res = await sendOtp(req)
      assert.notStrictEqual(res.status, 429)
    }
    const blocked = await sendOtp(
      new NextRequest("http://localhost:3000/api/booking/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": testIp },
        body: JSON.stringify({ phone: "09120000099" }),
      })
    )
    assert.strictEqual(blocked.status, 429)
  })

  // 8. Cancel endpoint IP rate limit
  await checkAsync("Cancel booking endpoint enforces IP rate limit (429 on 11th request)", async () => {
    const testIp = `192.0.2.${Math.floor(10 + Math.random() * 200)}`
    for (let i = 1; i <= 10; i++) {
      const res = await cancelBooking(
        new NextRequest("http://localhost:3000/api/booking/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-real-ip": testIp },
          body: JSON.stringify({ trackingCode: "KB-00000", phone: "09120000000" }),
        })
      )
      assert.strictEqual(res.status, 404)
    }
    const blocked = await cancelBooking(
      new NextRequest("http://localhost:3000/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-real-ip": testIp },
        body: JSON.stringify({ trackingCode: "KB-00000", phone: "09120000000" }),
      })
    )
    assert.strictEqual(blocked.status, 429)
  })

  // 9. Demo credentials absent from AdminLoginClient.tsx source
  check("AdminLoginClient.tsx contains zero hardcoded demo passwords", () => {
    const clientSrc = fs.readFileSync(path.join(process.cwd(), "app/admin-login/AdminLoginClient.tsx"), "utf8")
    assert(!clientSrc.includes("admin123456"), "admin123456 found in AdminLoginClient.tsx")
    assert(!clientSrc.includes("staff123456"), "staff123456 found in AdminLoginClient.tsx")
  })

  console.log("==================================================================")
  console.log(`  PHASE 2 SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`)
  console.log("==================================================================")
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
