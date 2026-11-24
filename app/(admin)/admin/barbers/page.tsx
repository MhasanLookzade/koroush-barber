import { Metadata } from "next"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { AdminBarbersClient } from "./AdminBarbersClient"

export const metadata: Metadata = {
  title: "مدیریت آرایشگرها | پنل مدیریت کوروش باربر",
  description: "افزودن، ویرایش و مدیریت آرایشگرهای آرایشگاه",
}

export default async function AdminBarbersPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("admin_token")?.value || cookieStore.get("admin_auth")?.value
  if (!token) {
    redirect("/admin-login")
  }

  return <AdminBarbersClient />
}