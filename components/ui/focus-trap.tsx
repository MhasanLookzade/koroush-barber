"use client"

import { useEffect, useRef } from "react"

interface FocusTrapProps {
  children: React.ReactNode
  active?: boolean
  onDeactivate?: () => void
}

export function FocusTrap({ children, active = true, onDeactivate }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    // Store the currently focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement

    // Focus the first focusable element in the trap
    const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return

      const focusableElementsArray = Array.from(focusableElements)
      const firstElement = focusableElementsArray[0]
      const lastElement = focusableElementsArray[focusableElementsArray.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      // Restore focus to previously focused element
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus()
      }
      onDeactivate?.()
    }
  }, [active, onDeactivate])

  return <div ref={containerRef}>{children}</div>
}

interface FocusTrapDialogProps {
  children: React.ReactNode
  open: boolean
  onClose: () => void
  title: string
  description?: string
}

export function FocusTrapDialog({ children, open, onClose, title, description }: FocusTrapDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = `${title.replace(/\s+/g, '-').toLowerCase()}-title`
  const descId = description ? `${title.replace(/\s+/g, '-').toLowerCase()}-desc` : undefined

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.showModal()
    } else if (!open && dialogRef.current) {
      dialogRef.current.close()
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "Escape") {
      onClose()
    }
  }

  if (!open) return null

  return (
    <FocusTrap active={true} onDeactivate={onClose}>
      <dialog
        ref={dialogRef}
        onClose={onClose}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-50 m-auto max-w-lg rounded-2xl border border-border bg-background p-6 shadow-luxury-xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <div className="sr-only" id={titleId}>{title}</div>
        {description && <div className="sr-only" id={descId}>{description}</div>}
        {children}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="بستن دیالوگ"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </dialog>
      <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
    </FocusTrap>
  )
}