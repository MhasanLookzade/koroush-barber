import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "input-luxury",
  {
    variants: {
      inputSize: {
        sm: "h-9 px-3 text-sm",
        default: "h-11 px-4 text-base",
        lg: "h-14 px-6 text-lg",
      },
      state: {
        default: "",
        error: "border-destructive focus:border-destructive focus:ring-destructive/20",
        success: "border-success focus:border-success focus:ring-success/20",
      },
    },
    defaultVariants: {
      inputSize: "default",
      state: "default",
    },
  }
)

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  error?: string
  label?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, hint, id, inputSize, state, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")
    const errorId = error ? `${inputId}-error` : undefined
    const hintId = hint ? `${inputId}-hint` : undefined
    const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-body-sm font-medium text-foreground mb-2"
          >
            {label}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(inputVariants({ inputSize, state: error ? "error" : state }), className)}
          ref={ref}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={describedBy}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-2 text-caption text-destructive flex items-center gap-1" role="alert">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="mt-2 text-caption text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }