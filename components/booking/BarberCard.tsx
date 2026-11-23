"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Star, MapPin, Clock, Crown, Sparkles, Award } from "lucide-react"
import { Barber } from "@/types"
import { cn } from "@/lib/utils"

interface BarberCardProps {
  barber: Barber & { services: Barber['services'] }
  selected: boolean
  onSelect: () => void
  index: number
}

const titleLabels: Record<string, string> = {
  "موسس و آرایشگر ارشد": "موسس",
  "آرایشگر ارشد - متخصص ریش": "ارشد",
  "آرایشگر - متخصص مو و استایل": "استایل",
  "آرایشگر - متخصص پوست و مراقبت": "پوست",
  "آرایشگر جوان - استایل‌های جدید": "جوان",
  "آرایشگر - متخصص پکیج‌های VIP": "VIP",
}

export function BarberCard({ barber, selected, onSelect, index }: BarberCardProps) {
  const shortTitle = barber.title ? (titleLabels[barber.title] || barber.title) : "آرایشگر"

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
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={selected ? `${barber.name}، انتخاب شده` : `انتخاب آرایشگر ${barber.name}`}
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

      {/* Title Badge */}
      <div className="absolute top-3 right-3 z-10">
        <Badge className="badge-luxury-primary gap-1 px-2 py-1">
          <Crown className="h-3 w-3" />
          {shortTitle}
        </Badge>
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-4">
          <Avatar className="h-18 w-18 ring-2 ring-primary/20">
            <AvatarImage src={barber.avatar || ""} alt={barber.name} className="object-cover" />
            <AvatarFallback className="text-2xl font-heading font-bold bg-primary/10 text-primary">
              {barber.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-xl truncate">{barber.name}</h3>
            <Badge className="badge-luxury-primary mt-1.5 text-xs">
              {barber.title}
            </Badge>
            {barber.bio && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{barber.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-sm">
              {barber.rating && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {barber.rating}
                  {barber.reviewCount && <span className="text-muted-foreground font-normal">({barber.reviewCount} نظر)</span>}
                </span>
              )}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                {barber.services.length} تخصص
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="border-t border-border/50 pt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {barber.specialties?.slice(0, 3).map((specialty) => (
              <Badge key={specialty} className="badge-luxury-primary text-xs">
                {specialty}
              </Badge>
            ))}
            {barber.specialties && barber.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                +{barber.specialties.length - 3} بیشتر
              </Badge>
            )}
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
                انتخاب این آرایشگر
                <Sparkles className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </CardContent>

      {/* Hover Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  )
}