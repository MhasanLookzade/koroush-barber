import { Metadata } from "next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AdminBarbersClient } from "./AdminBarbersClient"

export const metadata: Metadata = {
  title: "مدیریت آرایشگرها | BarberBook Admin",
  description: "افزودن، ویرایش و مدیریت آرایشگرهای آرایشگاه",
}

export default async function AdminBarbersPage() {
  const cookieStore = await cookies()
  const adminAuth = cookieStore.get("admin_auth")?.value
  if (!adminAuth) {
    redirect("/admin/login")
  }

  return <AdminBarbersClient />
}