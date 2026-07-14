import { BarChart3, Globe, QrCode, Shield, Users, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const features = [
  {
    icon: Zap,
    title: "Smart Short Links",
    description: "Auto-generated or custom short codes with password protection, expiry schedules, and link chaining (up to 5 hops).",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description: "Track every click with GeoIP, device type, browser, OS, referrer data, and bot detection — all in real time.",
  },
  {
    icon: QrCode,
    title: "QR Code Generation",
    description: "Generate PNG or SVG QR codes on the fly with optional logo embedding for your brand.",
  },
  {
    icon: Globe,
    title: "Custom Domains",
    description: "Bring your own domain with automatic DNS verification, SSL tracking, and vanity short links.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Organize links into nested collections, assign colour-coded tags, and manage access with role-based permissions.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SSRF protection, bot detection, rate limiting, audit logging, and AAL2-compliant two-factor authentication.",
  },
]

export default function FeatureGrid() {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section id="features" className="border-t bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-headline">
            Everything you need to manage
            <br />
            your links
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            From creation to analytics, Linkify handles the complete link lifecycle so you can focus on what matters.
          </p>
        </div>

        <div
          ref={ref}
          className={`mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-stagger ${isVisible ? "visible" : ""}`}
        >
          {features.map((feature) => (
            <Card key={feature.title} className="group border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
              <CardContent className="p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
