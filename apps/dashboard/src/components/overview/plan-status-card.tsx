import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow, format } from "date-fns"
import { CreditCard, Sparkles } from "lucide-react"
import type { UserSubscription } from "@linkify/shared"

interface PlanStatusCardProps {
  subscription: UserSubscription | null
}

export default function PlanStatusCard({ subscription }: PlanStatusCardProps) {
  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              No active subscription
            </p>
            <Link to="/billing/plans">
              <Button size="sm">Choose a plan</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { plan } = subscription
  const cancelScheduled = plan.cancelAtPeriodEnd
  const statusColors: Record<string, "default" | "success" | "outline" | "destructive"> = {
    active: "success",
    trialing: "default",
    past_due: "destructive",
    canceled: "outline",
    unpaid: "destructive",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Plan</CardTitle>
        <CreditCard className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            {plan.planName}
          </span>
          <Badge variant={statusColors[plan.status] ?? "outline"}>
            {cancelScheduled ? "Cancelling" : plan.status}
          </Badge>
        </div>

        {plan.currentPeriodEnd && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {cancelScheduled
                ? "Ends"
                : "Renews"}{" "}
              {formatDistanceToNow(new Date(plan.currentPeriodEnd), { addSuffix: true })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(plan.currentPeriodEnd), "MMM d, yyyy")}
            </p>
          </div>
        )}

        <div className="pt-1">
          <Link to="/billing">
            <Button variant="outline" size="sm" className="w-full">
              Manage
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
