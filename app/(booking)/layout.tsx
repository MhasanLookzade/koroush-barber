import { ReactNode } from "react"
import { Header } from "@/components/booking/Header"
import { Footer } from "@/components/booking/Footer"

export default function BookingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header id="navigation" />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer id="footer" />
    </div>
  )
}