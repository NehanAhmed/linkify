import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

const faqs = [
  {
    q: "What is Linkify?",
    a: "Linkify is an enterprise-grade URL shortener and link management platform. It lets you create short links, track clicks with detailed analytics, generate QR codes, use custom domains, and manage links with teams — all in one place.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes! The Free plan includes 500 links per month, basic analytics, QR codes, and one custom domain. No credit card required.",
  },
  {
    q: "Can I use my own domain?",
    a: "Absolutely. All plans support custom domains. We handle automatic DNS verification and SSL certificate tracking so your links always resolve securely.",
  },
  {
    q: "What kind of analytics do you provide?",
    a: "Every click is tracked with rich data: geographic location (GeoIP), device type, operating system, browser, referrer source, and bot detection. Pro and Enterprise plans include CSV export and real-time dashboards.",
  },
  {
    q: "How secure is Linkify?",
    a: "Security is built into every layer: SSRF protection blocks internal network requests, rate limiting prevents abuse, password protection secures individual links, and audit logging tracks every action. We also support AAL2-compliant two-factor authentication.",
  },
  {
    q: "Can I migrate from another URL shortener?",
    a: "Yes. You can import up to 500 URLs at once via CSV. Your existing short links can also be recreated with custom codes that match your current setup.",
  },
]

export default function FAQSection() {
  const { ref, isVisible } = useScrollAnimation(0.05)

  return (
    <section id="faq" className="border-t bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-headline">
            Frequently asked questions
          </h2>
        </div>

        <div
          ref={ref}
          className={`mt-14 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <Accordion defaultValue={["item-0"]}>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
