import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Marketing Director, GrowthBox",
    quote: "Linkify transformed how we track campaign performance. The analytics alone saved us hours every week — we now know exactly which channels drive conversions.",
    rating: 5,
    initials: "SC",
  },
  {
    name: "Marcus Rivera",
    role: "Founder, DevStudio",
    quote: "We manage hundreds of client links daily. Linkify's collections and tags make organisation effortless. The SSRF protection gives us peace of mind.",
    rating: 5,
    initials: "MR",
  },
  {
    name: "Emily Nakamura",
    role: "Product Lead, SaaSGrid",
    quote: "Switched from Bitly for the custom domains and better analytics. The QR code generator with our logo is a nice touch our clients love.",
    rating: 5,
    initials: "EN",
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section className="border-t bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-headline">
            Loved by teams
            <br />
            <span className="text-primary">worldwide</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            See why thousands of companies trust Linkify for their link management.
          </p>
        </div>

        <div
          ref={ref}
          className={`mt-14 grid gap-6 md:grid-cols-3 animate-stagger ${isVisible ? "visible" : ""}`}
        >
          {testimonials.map((t) => (
            <Card key={t.name} className="flex flex-col border bg-background/50 backdrop-blur-sm shadow-sm">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">{t.initials}</AvatarFallback>
                  </Avatar>
                  <StarRating count={t.rating} />
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
