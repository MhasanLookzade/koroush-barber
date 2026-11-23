import { Metadata } from "next"
import { AdminSettingsClient } from "./AdminSettingsClient"

export const metadata: Metadata = {
  title: "تنظیمات سالن و سامانه | پنل مدیریت کوروش باربر",
  description: "تنظیمات عمومی، قوانین لغو، مدت هلد و اتصال به درگاه پرداخت",
}

export default function AdminSettingsPage() {
  return <AdminSettingsClient />
}
