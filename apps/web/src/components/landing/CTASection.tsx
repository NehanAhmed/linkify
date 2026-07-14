import { ArrowRight, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export default function CTASection() {
  const { ref, isVisible } = useScrollAnimation(0.15)

  return (
    <section id="cta" className="border-t bg-background py-20 sm:py-28">
      <div
        ref={ref}
        className={`mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
      >
        <h2 className="text-headline">
          Start shortening your links today
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Join thousands of teams who trust Linkify. Free to start, no credit card required.
        </p>

        <div className="mx-auto mt-8 flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Paste your long URL"
              className="pl-10 h-12"
            />
          </div>
          <Button size="lg" className="h-12 shrink-0">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Free plan: 500 links/month. Upgrade anytime.
        </p>
      </div>
    </section>
  )
}
