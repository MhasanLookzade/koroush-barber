"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/utils"
import { Scissors, Clock, CheckCircle, Sparkles, Star, Crown } from "lucide-react"
import { Service } from "@/types"
import { cn } from "@/lib/utils"

interface ServiceCardProps {
  service: Service
  selected: boolean
  onSelect: () => void
  index: number
}

const categoryLabels: Record<string, string> = {
  hair: "قص مو",
  beard: "سبیل و ریش",
  skin: "پوست و مراقبت",
  packages: "پکیج‌ها",
}

const categoryIcons: Record<string, React.ReactNode> = {
  hair: <Scissors className="h-4 w-4" />,
  beard: <Sparkles className="h-4 w-4" />,
  skin: <Star className="h-4 w-4" />,
  packages: <Crown className="h-4 w-4" />,
}

export function ServiceCard({ service, selected, onSelect, index }: ServiceCardProps) {
  const categoryLabel = categoryLabels[service.category] || service.category
  const categoryIcon = categoryIcons[service.category] || <Scissors className="h-4 w-4" />

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onSelect()
    }
  }

  return (
    <Card
      className={cn(
        "relative cursor-pointer transition-all duration-300 overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-2",
        selected
          ? "border-primary bg-gradient-to-br from-primary/5 to-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg"
          : "border-border/50 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 bg-background"
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={selected ? `${service.name}، انتخاب شده` : `انتخاب خدمت ${service.name}`}
    >
      {/* Selection Indicator */}
      <div className="absolute top-3 left-3 z-10">
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-200",
          selected
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted/50 text-transparent hover:border-primary/50"
        )}>
          {selected && <CheckCircle className="h-4 w-4" />}
        </div>
      </div>

      {/* Popular Badge */}
      {service.popular && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className="badge-luxury-warning gap-1 px-2 py-1">
            <Star className="h-3 w-3" />
            محبوب
          </Badge>
        </div>
      )}

      {/* Category Badge */}
      <div className="absolute bottom-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="secondary" className="gap-1 px-2 py-1">
          {categoryIcon}
          {categoryLabel}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {categoryIcon}
              </div>
            </div>
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{service.name}</CardTitle>
          </div>
        </div>
        {service.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{service.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{service.duration} دقیقه</span>
          </div>
          <div className="flex items-center gap-2 font-heading font-semibold text-primary persian-nums">
            <span>{formatPrice(service.price)}</span>
            <span className="text-muted-foreground font-normal">تومان</span>
          </div>
        </div>

        {/* Selection status instead of nested button */}
        <div className={cn(
          "w-full py-3 px-4 rounded-xl text-center font-medium transition-all duration-200",
          selected
            ? "bg-primary text-primary-foreground shadow-luxury"
            : "bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        )}>
          {selected ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" />
              انتخاب شده
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              انتخاب این خدمت
              <Sparkles className="h-4 w-4" />
            </span>
          )}
        </div>
      </CardContent>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  )
}