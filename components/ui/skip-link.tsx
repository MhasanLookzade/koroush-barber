"use client"

import Link from "next/link"

interface SkipLinkProps {
  targets: Array<{ id: string; label: string }>
}

export function SkipLink({ targets }: SkipLinkProps) {
  return (
    <nav className="sr-only focus-within:not-sr-only fixed top-4 right-4 z-50" aria-label="لینک‌های پرش">
      <ul className="flex flex-col gap-2">
        {targets.map((target) => (
          <li key={target.id}>
            <Link
              href={`#${target.id}`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium shadow-luxury hover:shadow-luxury-lg transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {target.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export const defaultSkipTargets = [
  { id: "main-content", label: "محتوا اصلی" },
  { id: "navigation", label: "منوی ناوبری" },
  { id: "booking", label: "رزرو نوبت" },
  { id: "footer", label: "پایین صفحه" },
]