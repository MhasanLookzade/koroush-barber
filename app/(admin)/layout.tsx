import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminNavProvider } from "@/components/admin/AdminNavContext"
import { verifyAdminToken } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value || cookieStore.get("admin_auth")?.value

  let isAuthenticated = false
  if (token) {
    const session = verifyAdminToken(token)
    if (session) {
      isAuthenticated = true
    }
  }

  if (!isAuthenticated) {
    redirect("/admin-login")
  }

  return (
    <AdminNavProvider>
      <div className="flex h-screen bg-[#0D0F0E] text-[#F5F1E8]" dir="rtl">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-[#0D0F0E] min-w-0">
            {children}
          </main>
        </div>
      </div>
    </AdminNavProvider>
  )
}
