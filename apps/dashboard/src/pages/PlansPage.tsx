import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { listPlans, createCheckoutSession, getSubscription } from "@/lib/api"
import type { Plan, UserPlanInfo } from "@linkify/shared"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Check, X as XIcon, Loader2 } from "lucide-react"

const FEATURE_LABELS: Record<string, string> = {
  advancedStats: "Advanced analytics",
  customDomains: "Custom domains",
  passwordProtection: "Password protection",
  bulkOperations: "Bulk operations",
  apiAccess: "API access",
  affiliateLinks: "Affiliate links",
  prioritySupport: "Priority support",
}

export default function PlansPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const navigate = useNavigate()

  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlan, setCurrentPlan] = useState<UserPlanInfo | null>(null)
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [plansData, subData] = await Promise.all([
        listPlans(),
        token ? getSubscription(token).catch(() => null) : null,
      ])
      setPlans(plansData.sort((a, b) => a.sortOrder - b.sortOrder))
      if (subData) setCurrentPlan(subData.plan)
    } catch {
      toast.error("Failed to load plans")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubscribe = async (planCode: string) => {
    if (!token) return
    setSubscribing(planCode)
    try {
      const { url } = await createCheckoutSession(token, { planCode })
      window.location.href = url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start checkout"
      toast.error(msg)
    } finally {
      setSubscribing(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Choose the plan that fits your needs."
      />

      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${!yearly ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          Monthly
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            yearly ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
              yearly ? "translate-x-[22px]" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className={`text-sm ${yearly ? "font-medium text-foreground" : "text-muted-foreground"}`}>
          Yearly
          <Badge variant="default" className="ml-1.5 text-[10px]">Save up to 17%</Badge>
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price = yearly ? plan.priceYearly : plan.priceMonthly
          const isCurrent = currentPlan?.planCode === plan.code
          const isFree = plan.code === "free"

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-card p-6 transition-shadow hover:shadow-md ${
                isCurrent ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              {isCurrent && (
                <Badge variant="default" className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs">
                  Current plan
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">
                  ${price}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{yearly ? "year" : "month"}
                </span>
                {isFree && <span className="ml-1 text-sm text-muted-foreground">(free forever)</span>}
              </div>

              <div className="mb-6 space-y-3 flex-1">
                {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                  const included = plan.features[key as keyof typeof plan.features]
                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {included ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : (
                        <XIcon className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span className={included ? "text-foreground" : "text-muted-foreground"}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-auto">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : isFree ? (
                  <Button variant="outline" className="w-full" onClick={() => navigate("/billing")}>
                    Downgrade to Free
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.code)}
                    disabled={subscribing === plan.code}
                  >
                    {subscribing === plan.code ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : currentPlan ? (
                      "Upgrade"
                    ) : (
                      "Subscribe"
                    )}
                  </Button>
                )}
              </div>

              <div className="mt-3 text-center text-xs text-muted-foreground">
                {plan.maxLinks.toLocaleString()} link limit
                {plan.maxCustomDomains > 0 && ` · ${plan.maxCustomDomains} custom domains`}
                {plan.apiRateLimit > 0 && ` · ${plan.apiRateLimit.toLocaleString()} req/mo`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
