import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"
import type { ReactNode } from "react"

interface StatsCardProps {
  title: string
  value: string
  icon: ReactNode
  subtitle?: string
  delta?: {
    value: number
    isPositive: boolean
  }
  progress?: {
    value: number
    max: number
  }
}

export default function StatsCard({ title, value, icon, subtitle, delta, progress }: StatsCardProps) {
  const progressPercent = progress ? Math.min((progress.value / progress.max) * 100, 100) : 0
  const progressColor =
    progressPercent >= 80 ? "bg-destructive" : progressPercent >= 60 ? "bg-accent" : "bg-primary"

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
            {delta && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                delta.isPositive ? "text-emerald-600" : "text-destructive"
              )}>
                {delta.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="tabular-nums">{delta.value}%</span>
              </div>
            )}
            {subtitle && !delta && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        {progress && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all duration-500", progressColor)}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
