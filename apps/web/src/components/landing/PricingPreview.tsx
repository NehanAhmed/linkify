import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started.",
    features: [
      "500 links/month",
      "Basic analytics",
      "QR codes (PNG)",
      "1 custom domain",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For professionals and growing teams.",
    features: [
      "10,000 links/month",
      "Advanced analytics",
      "QR codes (PNG + SVG)",
      "5 custom domains",
      "Link chaining",
      "CSV export",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For organisations with advanced needs.",
    features: [
      "Unlimited links",
      "Real-time analytics",
      "QR codes with logo",
      "Unlimited custom domains",
      "SSRF & bot protection",
      "Audit logging",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export default function PricingPreview() {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section id="pricing" className="border-t bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-headline">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Start free, upgrade when you grow. No hidden fees, no surprises.
          </p>
        </div>

        <div
          ref={ref}
          className={`mt-14 grid gap-8 lg:grid-cols-3 items-start animate-stagger ${isVisible ? "visible" : ""}`}
        >
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={cn(
                "relative flex flex-col border bg-card",
                tier.popular && "border-primary shadow-lg scale-105",
              )}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader className="p-6 pb-0">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && <span className="text-sm text-muted-foreground">{tier.period}</span>}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col gap-6 p-6">
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full"
                  render={<a href="#cta" />}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
