import { useScrollAnimation } from "@/hooks/use-scroll-animation"
import { useCounter } from "@/hooks/use-counter"

const stats = [
  { label: "Active Users", end: 10000, suffix: "+" },
  { label: "Links Shortened", end: 1000000, suffix: "+" },
  { label: "Uptime", end: 99.9, suffix: "%", decimals: 1 },
  { label: "Countries", end: 50, suffix: "+" },
]

function AnimatedStat({ end, suffix, label, decimals = 0 }: { end: number; suffix: string; label: string; decimals?: number }) {
  const { ref, isVisible } = useScrollAnimation(0.3)
  const count = useCounter(end, 2500, isVisible)

  return (
    <div ref={ref} className={`text-center ${isVisible ? "animate-count-in" : "opacity-0"}`}>
      <div className="text-4xl font-bold tracking-tight sm:text-5xl">
        {count.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

export default function StatsSection() {
  return (
    <section className="border-t bg-background py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {stats.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  )
}
