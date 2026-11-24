import { ReactNode } from "react"
import { Header } from "@/components/shared/Header"
import { Footer } from "@/components/shared/Footer"

export default function BookingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0D0F0E] text-[#F7F4EE]">
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
