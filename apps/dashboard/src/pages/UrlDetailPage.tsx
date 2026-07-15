import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getUrlInfo, getUrlVisits, getUrlStats, exportVisitsCsv, generateQrCode, softDeleteUrl } from "@/lib/api"
import type { ShortUrl, Visit, VisitStats, Pagination as PaginatedInfo } from "@linkify/shared"
import { toast } from "sonner"
import { useParams, useNavigate, Link } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import StatusBadge, { getLinkStatus } from "@/components/status-badge"
import CopyButton from "@/components/copy-button"
import TablePagination from "@/components/ui/pagination"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend,
} from "recharts"
import {
  ExternalLink,
  Trash2,
  Settings,
  Download,
  QrCode,
  Eye,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Bot,
  Loader2,
  Calendar,
  BarChart3,
  Activity,
} from "lucide-react"
import { format } from "date-fns"

const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", GB: "🇬🇧", CA: "🇨🇦", AU: "🇦🇺", DE: "🇩🇪",
  FR: "🇫🇷", JP: "🇯🇵", BR: "🇧🇷", IN: "🇮🇳", CN: "🇨🇳",
  RU: "🇷🇺", KR: "🇰🇷", NL: "🇳🇱", SE: "🇸🇪", NO: "🇳🇴",
  DK: "🇩🇰", FI: "🇫🇮", IT: "🇮🇹", ES: "🇪🇸", PT: "🇵🇹",
  CH: "🇨🇭", AT: "🇦🇹", BE: "🇧🇪", IE: "🇮🇪", NZ: "🇳🇿",
  SG: "🇸🇬", HK: "🇭🇰", TW: "🇹🇼", AE: "🇦🇪", SA: "🇸🇦",
  MX: "🇲🇽", AR: "🇦🇷", CO: "🇨🇴", CL: "🇨🇱", ZA: "🇿🇦",
  NG: "🇳🇬", EG: "🇪🇬", IL: "🇮🇱", TR: "🇹🇷", TH: "🇹🇭",
  VN: "🇻🇳", PH: "🇵🇭", ID: "🇮🇩", MY: "🇲🇾", PK: "🇵🇰",
  BD: "🇧🇩", PL: "🇵🇱", UA: "🇺🇦", RO: "🇷🇴", CZ: "🇨🇿",
  GR: "🇬🇷", HU: "🇭🇺", SK: "🇸🇰", BG: "🇧🇬", HR: "🇭🇷",
  RS: "🇷🇸", LT: "🇱🇹", SI: "🇸🇮", EE: "🇪🇪", LV: "🇱🇻",
  IS: "🇮🇸", LU: "🇱🇺", MT: "🇲🇹", CY: "🇨🇾", AM: "🇦🇲",
  GE: "🇬🇪", AZ: "🇦🇿", KZ: "🇰🇿", UZ: "🇺🇿", PE: "🇵🇪",
}

function getFlag(country: string | null): string {
  if (!country) return "🌍"
  return COUNTRY_FLAGS[country.toUpperCase()] ?? "🌍"
}

function getDeviceIcon(deviceType: string | null) {
  switch (deviceType?.toLowerCase()) {
    case "mobile": return <Smartphone className="h-3.5 w-3.5" />
    case "tablet": return <Tablet className="h-3.5 w-3.5" />
    default: return <Monitor className="h-3.5 w-3.5" />
  }
}

function referrerCategoryColor(category: string | null): "default" | "secondary" | "outline" {
  switch (category) {
    case "direct": return "default"
    case "search": return "secondary"
    case "social": return "outline"
    default: return "secondary"
  }
}

export default function UrlDetailPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [urlInfo, setUrlInfo] = useState<ShortUrl | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [visitsPagination, setVisitsPagination] = useState<PaginatedInfo | null>(null)
  const [stats, setStats] = useState<VisitStats | null>(null)
  const [activeTab, setActiveTab] = useState("info")
  const [loading, setLoading] = useState(true)
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [csvLoading, setCsvLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrDialog, setQrDialog] = useState(false)
  const [qrFormat, setQrFormat] = useState<"png" | "svg">("png")
  const [qrLogo, setQrLogo] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrResultFormat, setQrResultFormat] = useState<"png" | "svg">("png")
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showTotal, setShowTotal] = useState(true)

  const fetchUrlInfo = useCallback(async (signal?: AbortSignal) => {
    if (!code) return
    try {
      const data = await getUrlInfo(token, code, signal)
      if (!signal?.aborted) setUrlInfo(data)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      const msg = err instanceof Error ? err.message : "URL not found"
      if (!signal?.aborted) toast.error(msg)
      if (!signal?.aborted) navigate("/urls")
    }
  }, [code, token, navigate])

  const fetchVisits = useCallback(async (page = 1, signal?: AbortSignal) => {
    if (!code) return
    setVisitsLoading(true)
    try {
      const data = await getUrlVisits(token, code, { page, limit: 15 }, signal)
      if (!signal?.aborted) {
        setVisits(data.visits)
        setVisitsPagination(data.pagination)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      if (!signal?.aborted) toast.error("Failed to load visits")
    } finally {
      if (!signal?.aborted) setVisitsLoading(false)
    }
  }, [code, token])

  const fetchStats = useCallback(async (signal?: AbortSignal) => {
    if (!code) return
    setStatsLoading(true)
    try {
      const data = await getUrlStats(token, code, signal)
      if (!signal?.aborted) setStats(data)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      if (!signal?.aborted) toast.error("Failed to load stats")
    } finally {
      if (!signal?.aborted) setStatsLoading(false)
    }
  }, [code, token])

  useEffect(() => {
    if (!code) return
    const abortController = new AbortController()
    setLoading(true)
    Promise.all([
      fetchUrlInfo(abortController.signal),
      fetchVisits(1, abortController.signal),
      fetchStats(abortController.signal),
    ]).finally(() => {
      if (!abortController.signal.aborted) setLoading(false)
    })
    return () => abortController.abort()
  }, [code, fetchUrlInfo, fetchVisits, fetchStats])

  const handleExportCsv = async () => {
    if (!code) return
    setCsvLoading(true)
    try {
      const blob = await exportVisitsCsv(token, code)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${code}-visits.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("CSV downloaded")
    } catch {
      toast.error("Failed to export CSV")
    } finally {
      setCsvLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (qrDataUrl) URL.revokeObjectURL(qrDataUrl)
    }
  }, [])

  const handleGenerateQr = async () => {
    if (!code) return
    setQrLoading(true)
    if (qrDataUrl) URL.revokeObjectURL(qrDataUrl)
    setQrDataUrl(null)
    try {
      const blob = await generateQrCode(code, qrFormat, qrLogo || undefined)
      const url = URL.createObjectURL(blob)
      setQrDataUrl(url)
      setQrResultFormat(qrFormat)
    } catch {
      toast.error("Failed to generate QR code")
    } finally {
      setQrLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!code) return
    setDeleting(true)
    try {
      await softDeleteUrl(token, code)
      toast.success("URL deleted")
      navigate("/urls")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const dailyChartData = (stats?.daily ?? []).map((d) => ({
    date: d.date ? format(new Date(d.date), "MMM d") : "",
    visits: d.visits,
    uniqueVisits: d.uniqueVisits,
  }))

  const hourlyChartData = (stats?.hourly ?? []).map((h) => ({
    hour: h.hour ? format(new Date(h.hour), "HH:mm") : "",
    visits: h.visits,
    uniqueVisits: h.uniqueVisits,
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!urlInfo) return null

  const status = getLinkStatus(urlInfo)

  return (
    <div className="space-y-6">
      <PageHeader
        title={urlInfo.code}
        description="View link analytics and activity"
        actions={
          <div className="flex gap-2">
            <Link
              to={`/urls/${code}/settings`}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 select-none h-8 px-3 text-xs border border-border bg-background text-foreground hover:bg-muted active:translate-y-[1px]"
            >
              <Settings className="mr-1.5 h-4 w-4" />
              Settings
            </Link>
            <Button variant="outline" size="sm" onClick={() => setDeleteDialog(true)}>
              <Trash2 className="mr-1.5 h-4 w-4 text-destructive" />
              <span className="text-destructive">Delete</span>
            </Button>
          </div>
        }
      />

      {/* Info Header Card */}
      <Card>
        <CardContent className="p-5 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xl font-semibold text-primary">{urlInfo.shortUrl}</span>
                <CopyButton text={urlInfo.shortUrl} variant="primary" size="sm" />
              </div>
              <a
                href={urlInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground truncate"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{urlInfo.url}</span>
              </a>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Total visits</p>
              <p className="text-lg font-semibold tabular-nums">{urlInfo.visits.toLocaleString()}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Unique visits</p>
              <p className="text-lg font-semibold tabular-nums">{urlInfo.uniqueVisits.toLocaleString()}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-sm font-medium tabular-nums">{format(new Date(urlInfo.createdAt), "MMM d, yyyy")}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="text-sm font-medium tabular-nums">
                {urlInfo.expiresAt ? format(new Date(urlInfo.expiresAt), "MMM d, yyyy") : "Never"}
              </p>
            </div>
          </div>

          {/* OG Preview */}
          {(urlInfo.title || urlInfo.description || urlInfo.image) && (
            <div className="flex gap-4 rounded-lg border border-border bg-muted/30 p-4">
              {urlInfo.image && (
                <img
                  src={urlInfo.image}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              )}
              <div className="min-w-0">
                {urlInfo.title && (
                  <p className="text-sm font-medium text-foreground truncate">{urlInfo.title}</p>
                )}
                {urlInfo.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{urlInfo.description}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">
            <Eye className="mr-1.5 h-4 w-4" />
            Info
          </TabsTrigger>
          <TabsTrigger value="visits">
            <Activity className="mr-1.5 h-4 w-4" />
            Visits
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="qr">
            <QrCode className="mr-1.5 h-4 w-4" />
            QR Code
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Code</p>
                  <p className="font-mono text-sm text-foreground">{urlInfo.code}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Block bots</p>
                  <p className="text-sm text-foreground">{urlInfo.blockBots ? "Yes" : "No"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Password protected</p>
                  <p className="text-sm text-foreground">{urlInfo.hasPassword ? "Yes" : "No"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Active at</p>
                  <p className="text-sm text-foreground">
                    {urlInfo.activeAt ? format(new Date(urlInfo.activeAt), "MMM d, yyyy HH:mm") : "Immediately"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Visit Log</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={csvLoading}>
                {csvLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-4 w-4" />
                )}
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : visits.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Eye className="h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">No visits yet</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>OS</TableHead>
                        <TableHead>Browser</TableHead>
                        <TableHead>Referrer</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                            {format(new Date(v.visitedAt), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {getFlag(v.country)} {v.country ?? "—"}
                              {v.city && <span className="text-muted-foreground">, {v.city}</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              {getDeviceIcon(v.deviceType)}
                              <span className="capitalize">{v.deviceType ?? "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{v.os ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {v.browser ?? "—"}
                            {v.browserVersion && (
                              <span className="text-xs text-muted-foreground/60"> v{v.browserVersion}</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[160px]">
                            <div className="flex items-center gap-1.5">
                              {v.referrerCategory && (
                                <Badge variant={referrerCategoryColor(v.referrerCategory)} className="text-[10px] px-1.5 py-0">
                                  {v.referrerCategory}
                                </Badge>
                              )}
                              {v.isBot && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                                  <Bot className="h-2.5 w-2.5" />
                                  Bot
                                </Badge>
                              )}
                              {v.referer && (
                                <span className="text-xs text-muted-foreground truncate">{v.referer}</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {visitsPagination && visitsPagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <TablePagination
                    page={visitsPagination.page}
                    totalPages={visitsPagination.totalPages}
                    onPageChange={fetchVisits}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <div className="space-y-4">
            {/* Summary stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{stats.totalVisits.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Unique</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{stats.uniqueVisits.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Daily avg</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">
                      {stats.daily.length > 0
                        ? Math.round(stats.totalVisits / stats.daily.length).toLocaleString()
                        : "0"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Daily chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Daily Visits (7 days)</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTotal(!showTotal)}
                  >
                    {showTotal ? "Show Unique" : "Show Total"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-64 w-full rounded-lg" />
                ) : dailyChartData.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Not enough data yet. Share your link to get started.
                    </p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dailyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                        <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
                        <RechartsTooltip />
                        <Bar
                          dataKey={showTotal ? "visits" : "uniqueVisits"}
                          fill="oklch(0.35 0.12 260)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Hourly chart */}
            <Card>
              <CardHeader>
                <CardTitle>Hourly Visits (24h)</CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-48 w-full rounded-lg" />
                ) : hourlyChartData.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">No hourly data available yet.</p>
                  </div>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                        <RechartsTooltip />
                        <Bar
                          dataKey={showTotal ? "visits" : "uniqueVisits"}
                          fill="oklch(0.55 0.01 260)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* QR Code Tab */}
        <TabsContent value="qr">
          <Card>
            <CardHeader>
              <CardTitle>QR Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="qr-format" className="text-xs font-medium text-muted-foreground">Format</label>
                  <select
                    id="qr-format"
                    value={qrFormat}
                    onChange={(e) => setQrFormat(e.target.value as "png" | "svg")}
                    className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="png">PNG</option>
                    <option value="svg">SVG</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="qr-logo" className="text-xs font-medium text-muted-foreground">Logo URL (optional)</label>
                  <input
                    id="qr-logo"
                    value={qrLogo}
                    onChange={(e) => setQrLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              <Button onClick={handleGenerateQr} disabled={qrLoading}>
                {qrLoading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-1.5 h-4 w-4" />
                )}
                {qrLoading ? "Generating..." : "Generate QR Code"}
              </Button>

              {qrDataUrl && (
                <div className="flex flex-col items-center gap-4 rounded-lg border border-border p-6">
                  <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
                  <a
                    href={qrDataUrl}
                    download={`${code}-qr.${qrResultFormat}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    Download {qrFormat.toUpperCase()}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogHeader>
          <DialogTitle>Delete URL</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-mono font-medium text-foreground">{code}</span>?
            This link will no longer be accessible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialog(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
