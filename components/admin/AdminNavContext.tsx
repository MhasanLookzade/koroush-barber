"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { usePathname } from "next/navigation"

interface AdminNavContextType {
  isMobileOpen: boolean
  setIsMobileOpen: (open: boolean) => void
  toggleMobileNav: () => void
  closeMobileNav: () => void
}

const AdminNavContext = createContext<AdminNavContextType | undefined>(undefined)

export function AdminNavProvider({ children }: { children: ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // Automatically close mobile nav drawer on route changes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const toggleMobileNav = () => setIsMobileOpen((prev) => !prev)
  const closeMobileNav = () => setIsMobileOpen(false)

  return (
    <AdminNavContext.Provider
      value={{ isMobileOpen, setIsMobileOpen, toggleMobileNav, closeMobileNav }}
    >
      {children}
    </AdminNavContext.Provider>
  )
}

export function useAdminNav() {
  const context = useContext(AdminNavContext)
  if (!context) {
    throw new Error("useAdminNav must be used within an AdminNavProvider")
  }
  return context
}
