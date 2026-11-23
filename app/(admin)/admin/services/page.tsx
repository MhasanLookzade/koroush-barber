import { Metadata } from "next"
import { AdminServicesClient } from "./AdminServicesClient"

export const metadata: Metadata = {
  title: "مدیریت خدمات و تعرفه‌ها | پنل مدیریت کوروش باربر",
  description: "افزودن، ویرایش و مدیریت تعرفه خدمات و بیعانه",
}

export default function AdminServicesPage() {
  return <AdminServicesClient />
}
