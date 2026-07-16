import { cn } from "@/lib/utils"

interface ProgressProps {
  value: number
  max?: number
  className?: string
  indicatorClassName?: string
}

export default function Progress({ value, max = 100, className, indicatorClassName }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-300", indicatorClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
