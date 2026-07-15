import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getUsage, getSubscription, listUrls, createUrl } from "@/lib/api"
import type { Usage, UserSubscription } from "@linkify/shared"
import type { ShortUrl, Pagination } from "@linkify/shared"
import { toast } from "sonner"
import PageHeader from "@/components/page-header"
import StatsCard from "@/components/overview/stats-card"
import RecentLinksList from "@/components/overview/recent-links-list"
import QuickCreateForm from "@/components/overview/quick-create-form"
import PlanStatusCard from "@/components/overview/plan-status-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Link2, MousePointerClick, Activity, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function OverviewPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""

  const [usage, setUsage] = useState<Usage | null>(null)
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [recentUrls, setRecentUrls] = useState<ShortUrl[]>([])
  const [totalUrls, setTotalUrls] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)

    try {
      const [usageData, subData, urlsData] = await Promise.all([
        getUsage(token).catch(() => null),
        getSubscription(token).catch(() => null),
        listUrls(token, {
          limit: "5",
          sortBy: "createdAt",
          sortOrder: "desc",
        }).catch(() => null),
      ])

      if (usageData) setUsage(usageData)
      if (subData) setSubscription(subData)
      if (urlsData) {
        setRecentUrls(urlsData.urls)
        setTotalUrls(urlsData.pagination.total)
      }
    } catch {
      setError("Failed to load overview data")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleShorten = async (url: string) => {
    const result = await createUrl(token, { url })
    await fetchData()
    return result
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchData}>Retry</Button>
      </div>
    )
  }

  const plan = usage?.plan
  const maxLinks = plan?.maxLinks ?? 100
  const linksUsed = usage?.totalLinks ?? 0
  const usagePercent = maxLinks > 0 ? Math.round((linksUsed / maxLinks) * 100) : 0
  const activeLinks = recentUrls.filter(
    (u) => !u.expiresAt || new Date(u.expiresAt) > new Date()
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Your dashboard at a glance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Links"
          value={linksUsed.toLocaleString()}
          icon={<Link2 className="h-4 w-4" />}
        />
        <StatsCard
          title="Total Visits"
          value={(usage?.totalVisits ?? 0).toLocaleString()}
          icon={<MousePointerClick className="h-4 w-4" />}
        />
        <StatsCard
          title="Active Links"
          value={activeLinks.toLocaleString()}
          icon={<Activity className="h-4 w-4" />}
        />
        <StatsCard
          title="Plan Usage"
          value={`${usagePercent}%`}
          icon={<Gauge className="h-4 w-4" />}
          progress={{ value: usagePercent, max: 100 }}
          subtitle={`${linksUsed} / ${maxLinks} links`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <QuickCreateForm onShorten={handleShorten} />
          <RecentLinksList
            urls={recentUrls}
            totalUrls={totalUrls}
          />
        </div>
        <div className="space-y-4">
          <PlanStatusCard subscription={subscription} />
          {recentUrls.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <Link2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-medium text-foreground">No links yet</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first short link to get started.
              </p>
              <Link to="/urls/new">
                <Button size="sm" className="mt-4">
                  Create your first link
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
