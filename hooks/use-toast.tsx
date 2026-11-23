"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"

interface ToastProps {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

interface ToastContextType {
  toasts: ToastProps[]
  toast: (props: ToastProps) => void
  dismiss: (index: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProviderComponent({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = useCallback(({ title, description, variant = "default" }: ToastProps) => {
    setToasts(prev => [...prev, { title, description, variant }])
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 5000)
  }, [])

  const dismiss = useCallback((index: number) => {
    setToasts(prev => prev.filter((_, i) => i !== index))
  }, [])

  const contextValue = { toasts, toast, dismiss }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastProvider>
        {toasts.map((toast, index) => (
          <Toast key={index} variant={toast.variant}>
            <div className="grid gap-1">
              <ToastTitle>{toast.title}</ToastTitle>
              {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            </div>
            <ToastClose onClick={() => dismiss(index)} />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProviderComponent")
  }
  return context
}

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <ToastProvider>
      {toasts.map((toast, index) => (
        <Toast key={index} variant={toast.variant}>
          <div className="grid gap-1">
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
          </div>
          <ToastClose onClick={() => dismiss(index)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}