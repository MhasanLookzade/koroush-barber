import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-caption font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        luxury: "badge-luxury",
        "luxury-success": "badge-luxury-success",
        "luxury-warning": "badge-luxury-warning",
        "luxury-destructive": "badge-luxury-destructive",
        "luxury-info": "badge-luxury-info",
        // Kept for compatibility
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        destructive: "bg-destructive text-destructive-foreground border-transparent",
        outline: "text-foreground border-border bg-transparent",
        success: "bg-[hsl(var(--success)_/_0.15)] text-success border-[hsl(var(--success)_/_0.25)]",
        warning: "bg-[hsl(var(--warning)_/_0.15)] text-warning border-[hsl(var(--warning)_/_0.25)]",
        info: "bg-[hsl(var(--info)_/_0.15)] text-info border-[hsl(var(--info)_/_0.25)]",
      },
      size: {
        sm: "px-2 py-0.5 text-[0.7rem]",
        default: "px-3 py-1 text-caption",
        lg: "px-4 py-1.5 text-body-sm",
      },
    },
    defaultVariants: {
      variant: "luxury",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }