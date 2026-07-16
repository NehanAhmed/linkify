import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getSubscription, getUsage, getPortalUrl, cancelSubscription } from "@/lib/api"
import type { UserSubscription, Usage } from "@linkify/shared"
import { toast } from "sonner"
import { Link, useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Progress from "@/components/ui/progress"
import { format } from "date-fns"
import {
  CreditCard,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Link as LinkIcon,
  MousePointerClick,
} from "lucide-react"

function usageColor(pct: number): string {
  if (pct >= 80) return "bg-destructive"
  if (pct >= 60) return "bg-yellow-500"
  return "bg-primary"
}

export default function BillingPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const navigate = useNavigate()

  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)

  const [portalLoading, setPortalLoading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [subData, usageData] = await Promise.all([
        getSubscription(token).catch(() => null),
        getUsage(token).catch(() => null),
      ])
      setSubscription(subData)
      setUsage(usageData)
    } catch {
      toast.error("Failed to load billing data")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePortal = async () => {
    setPortalLoading(true)
    try {
      const { url } = await getPortalUrl(token)
      window.location.href = url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open billing portal"
      toast.error(msg)
    } finally {
      setPortalLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!subscription) return
    setCancelling(true)
    try {
      await cancelSubscription(token, subscription.subscription.id)
      toast.success("Subscription will be cancelled at period end")
      setCancelOpen(false)
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel subscription"
      toast.error(msg)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  const plan = subscription?.plan
  const sub = subscription?.subscription
  const maxLinks = plan?.maxLinks ?? usage?.plan?.maxLinks ?? 100
  const maxApi = plan?.apiRateLimit ?? usage?.plan?.apiRateLimit ?? 100
  const linksUsed = usage?.totalLinks ?? 0
  const totalVisits = usage?.totalVisits ?? 0
  const linksPct = maxLinks > 0 ? Math.round((linksUsed / maxLinks) * 100) : 0
  const apiPct = maxApi > 0 ? Math.round((totalVisits / maxApi) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription and usage."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{plan.planName}</p>
                    <Badge variant={plan.status === "active" ? "default" : "secondary"} className="mt-1">
                      {plan.status}
                    </Badge>
                  </div>
                  <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                </div>

                <div className="space-y-2 text-sm">
                  {sub && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Period start</span>
                        <span className="text-foreground tabular-nums">
                          {format(new Date(sub.currentPeriodStart), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Period end</span>
                        <span className="text-foreground tabular-nums">
                          {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
                        </span>
                      </div>
                    </>
                  )}
                  {plan.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Cancels at period end
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                    )}
                    Manage Subscription
                  </Button>
                  <Link to="/billing/plans">
                    <Button variant="outline" className="w-full">
                      <ArrowRight className="mr-1.5 h-4 w-4" />
                      Change Plan
                    </Button>
                  </Link>
                  {!plan.cancelAtPeriodEnd && plan.planCode !== "free" && (
                    <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">No active subscription</p>
                  <p className="mt-1 text-xs text-muted-foreground">You are on the Free plan.</p>
                </div>
                <Link to="/billing/plans">
                  <Button size="sm">View plans</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Resource usage for {usage?.quotaMonth ?? "this month"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Links</span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {linksUsed.toLocaleString()} / {maxLinks.toLocaleString()}
                </span>
              </div>
              <Progress
                value={linksUsed}
                max={maxLinks}
                indicatorClassName={usageColor(linksPct)}
              />
              {maxLinks > 0 && (
                <p className="text-xs text-muted-foreground">
                  {linksPct}% used
                  {linksPct >= 80 && " — consider upgrading"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Visits / API requests</span>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {totalVisits.toLocaleString()} / {maxApi.toLocaleString()}
                </span>
              </div>
              <Progress
                value={totalVisits}
                max={maxApi}
                indicatorClassName={usageColor(apiPct)}
              />
              {maxApi > 0 && (
                <p className="text-xs text-muted-foreground">
                  {apiPct}% used
                  {apiPct >= 80 && " — consider upgrading"}
                </p>
              )}
            </div>

            {plan ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                Features: {Object.entries(plan.features)
                  .filter(([, v]) => v)
                  .map(([k]) => k.replace(/([A-Z])/g, " $1").trim())
                  .join(", ") || "none"}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)}>
        <DialogHeader>
          <DialogTitle>Cancel subscription</DialogTitle>
          <DialogDescription>
            Your plan will remain active until the end of the current billing period
            ({subscription?.subscription?.currentPeriodEnd
              ? format(new Date(subscription.subscription.currentPeriodEnd), "MMMM d, yyyy")
              : "the end of the period"}).
            After that, you will be downgraded to the Free plan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
            Keep my plan
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="mr-1.5 h-4 w-4" />
            )}
            {cancelling ? "Cancelling..." : "Cancel subscription"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
