"use client"

import { useEffect, useRef, useState } from "react"

interface LiveRegionProps {
  message: string
  politeness?: "polite" | "assertive" | "off"
  clearAfter?: number
}

export function LiveRegion({ message, politeness = "polite", clearAfter = 3000 }: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = useState(message)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setCurrentMessage(message)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        setCurrentMessage("")
      }, clearAfter)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [message, clearAfter])

  if (!currentMessage) return null

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  )
}

// Hook for using live regions in components
export function useAnnouncement() {
  const [announcements, setAnnouncements] = useState<Array<{ id: number; message: string; politeness: "polite" | "assertive" }>>([])

  const announce = (message: string, politeness: "polite" | "assertive" = "polite") => {
    const id = Date.now()
    setAnnouncements(prev => [...prev, { id, message, politeness }])

    // Auto-cleanup
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    }, 3000)
  }

  return { announce, announcements }
}

// Component to render all announcements
export function AnnouncementRegion() {
  const { announcements } = useAnnouncement()

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcements.map(({ message }) => (
        <div key={message}>{message}</div>
      ))}
    </div>
  )
}