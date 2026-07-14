import { ArrowRight, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const trustLogos = [
  { name: "Vercel" },
  { name: "Stripe" },
  { name: "Supabase" },
  { name: "Auth0" },
  { name: "Neon" },
]

export default function HeroSection() {
  const { ref, isVisible } = useScrollAnimation(0.1)

  return (
    <section className="relative min-h-screen overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-background pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-primary/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div
        ref={ref}
        className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className={`text-center ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Enterprise-grade link management
          </div>

          <h1 className="text-display">
            Shorten. Analyze.
            <br />
            Own Your Links.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Linkify gives you full control over every link you share — with real-time analytics,
            custom domains, QR codes, and enterprise-grade security.
          </p>

          <div className="mx-auto mt-8 flex max-w-md items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="url"
                placeholder="Enter your long URL"
                className="pl-10 h-11"
              />
            </div>
            <Button size="lg" className="h-11 shrink-0">
              Shorten
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Free to start. No credit card required. 10K+ links shortened.
          </p>
        </div>

        <div className={`mt-16 ${isVisible ? "animate-fade-in" : "opacity-0"}`} style={{ animationDelay: "300ms" }}>
          <div className="relative mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">https://example.com/very-long-url-that-needs-shortening</span>
                  <span className="ml-auto text-xs text-muted-foreground">→</span>
                </div>
                <div className="mt-3 flex items-center gap-3 rounded-lg border bg-card p-3 text-sm">
                  <Link2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">linkify.io</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="font-semibold text-foreground">aB3xK9m</span>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">42 clicks today</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-8 opacity-50">
              <span className="text-xs font-medium text-muted-foreground tracking-widest uppercase">Trusted by</span>
              {trustLogos.map((logo) => (
                <span key={logo.name} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground/40">
                  {logo.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
