const http = require("http")

async function runAuthTests() {
  console.log("🚀 Testing Admin Authentication Endpoints...")
  const baseUrl = "http://localhost:3000"

  // 1. Test invalid login
  console.log("Step 1: Test invalid login credentials...")
  const resBad = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "wrongpassword999" }),
  })
  const jsonBad = await resBad.json()
  if (resBad.status === 401 && jsonBad.error) {
    console.log("  ✅ Invalid login correctly rejected with 401:", jsonBad.error)
  } else {
    throw new Error(`Expected 401 for bad password, got ${resBad.status}: ${JSON.stringify(jsonBad)}`)
  }

  // 2. Test valid login
  console.log("Step 2: Test valid login credentials (admin / admin123456)...")
  const resGood = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin123456" }),
  })
  const jsonGood = await resGood.json()
  if (resGood.status === 200 && jsonGood.success && jsonGood.token) {
    console.log("  ✅ Valid login succeeded with 200, token present, role:", jsonGood.user.role)
  } else {
    throw new Error(`Expected 200 for valid login, got ${resGood.status}: ${JSON.stringify(jsonGood)}`)
  }

  // Check Set-Cookie headers
  const setCookie = resGood.headers.get("set-cookie") || ""
  console.log("  Cookie header present:", setCookie.includes("admin_token"))
  if (!setCookie.includes("admin_token")) {
    throw new Error("Expected set-cookie to contain admin_token")
  }

  // Extract admin_token cookie
  const match = setCookie.match(/admin_token=([^;]+)/)
  const token = match ? match[1] : jsonGood.token

  // 3. Test /api/admin/auth/me with Cookie
  console.log("Step 3: Test /api/admin/auth/me with admin_token cookie...")
  const resMe = await fetch(`${baseUrl}/api/admin/auth/me`, {
    headers: {
      Cookie: `admin_token=${token}`,
    },
  })
  const jsonMe = await resMe.json()
  if (resMe.status === 200 && jsonMe.authenticated && jsonMe.user.username === "admin") {
    console.log("  ✅ /api/admin/auth/me authenticated successfully:", jsonMe.user.name, `(${jsonMe.user.role})`)
  } else {
    throw new Error(`Expected authenticated user from /api/admin/auth/me, got ${resMe.status}: ${JSON.stringify(jsonMe)}`)
  }

  // 4. Test unauthenticated request to /api/admin/auth/me
  console.log("Step 4: Test unauthenticated request to /api/admin/auth/me...")
  const resUnauth = await fetch(`${baseUrl}/api/admin/auth/me`)
  if (resUnauth.status === 401) {
    console.log("  ✅ Unauthenticated request correctly rejected with 401")
  } else {
    throw new Error(`Expected 401 for unauthenticated request, got ${resUnauth.status}`)
  }

  // 5. Test Staff login
  console.log("Step 5: Test staff login (staff / staff123456)...")
  const resStaff = await fetch(`${baseUrl}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "staff", password: "staff123456" }),
  })
  const jsonStaff = await resStaff.json()
  if (resStaff.status === 200 && jsonStaff.user.role === "STAFF") {
    console.log("  ✅ Staff login succeeded:", jsonStaff.user.name, `(${jsonStaff.user.role})`)
  } else {
    throw new Error(`Expected 200 for staff login, got ${resStaff.status}`)
  }

  // 6. Test Logout
  console.log("Step 6: Test logout endpoint...")
  const resLogout = await fetch(`${baseUrl}/api/admin/auth/logout`, {
    method: "POST",
  })
  const logoutSetCookie = resLogout.headers.get("set-cookie") || ""
  if (resLogout.status === 200 && logoutSetCookie.includes("admin_token=;")) {
    console.log("  ✅ Logout endpoint succeeded and cleared cookies")
  } else {
    console.log("  Logout response:", resLogout.status, logoutSetCookie)
  }

  console.log("🎉 ALL AUTHENTICATION TESTS PASSED!")
}

runAuthTests().catch(err => {
  console.error("❌ Auth test error:", err)
  process.exit(1)
})
