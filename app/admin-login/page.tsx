import { AdminLoginClient, DemoAccount } from "./AdminLoginClient"

export const dynamic = "force-dynamic"

export default function AdminLoginPage() {
  const isNonProduction = process.env.NODE_ENV !== "production"

  const demoAccounts: DemoAccount[] | undefined = isNonProduction
    ? [
        { label: "مدیر کل (OWNER)", username: "admin", password: process.env.INITIAL_ADMIN_PASSWORD || "admin123456" },
        { label: "پرسنل (STAFF)", username: "staff", password: process.env.INITIAL_STAFF_PASSWORD || "staff123456" },
      ]
    : undefined

  return <AdminLoginClient demoAccounts={demoAccounts} />
}
