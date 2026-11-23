import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyAdminToken } from "@/lib/auth"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protected Admin Routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin-login")) {
    const token =
      request.cookies.get("admin_token")?.value ||
      request.cookies.get("admin_auth")?.value

    let isAuthenticated = false
    if (token) {
      const session = verifyAdminToken(token)
      if (session) {
        isAuthenticated = true
      }
    }

    if (!isAuthenticated) {
      const loginUrl = new URL("/admin-login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      const redirectResponse = NextResponse.redirect(loginUrl)
      redirectResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
      return redirectResponse
    }

    const response = NextResponse.next()
    // Enforce no-indexing for search engines on all admin pages
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
