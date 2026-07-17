import { useState, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Copy, Check, Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ShortUrl } from "@linkify/shared"

const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60000

interface QuickCreateFormProps {
  onShorten: (url: string) => Promise<ShortUrl>
}

export default function QuickCreateForm({ onShorten }: QuickCreateFormProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ShortUrl | null>(null)
  const [copied, setCopied] = useState(false)
  const [rateCount, setRateCount] = useState(0)
  const timestampsRef = useRef<number[]>([])

  const isRateLimited = rateCount >= RATE_LIMIT

  const recordRequest = useCallback(() => {
    const now = Date.now()
    const windowStart = now - RATE_WINDOW_MS
    timestampsRef.current = timestampsRef.current.filter((t) => t > windowStart)
    timestampsRef.current.push(now)
    setRateCount(timestampsRef.current.length)
    if (timestampsRef.current.length >= RATE_LIMIT) {
      const oldest = timestampsRef.current[0]
      const resetIn = Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000)
      setTimeout(() => {
        timestampsRef.current = timestampsRef.current.filter((t) => t > Date.now() - RATE_WINDOW_MS)
        setRateCount(timestampsRef.current.length)
      }, resetIn * 1000)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    let normalized = url.trim()
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`
    }

    if (isRateLimited) {
      toast.error(`Rate limit reached. Wait a moment before creating more links.`)
      return
    }

    setLoading(true)
    setResult(null)

    try {
      recordRequest()
      const shortUrl = await onShorten(normalized)
      setResult(shortUrl)
      setUrl("")
      toast.success("Link created!")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create link"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.shortUrl)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="Paste a long URL to shorten..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-9"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading || !url.trim() || isRateLimited}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRateLimited ? (
              <Clock className="h-4 w-4" />
            ) : (
              "Shorten"
            )}
          </Button>
          {rateCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums self-center">
              {RATE_LIMIT - rateCount}
            </span>
          )}
        </form>

        {result && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 animate-in slide-in-from-top-1 fade-in duration-200">
            <div className="flex-1 truncate">
              <span className="text-sm font-medium text-primary">{result.shortUrl}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <Badge variant="success" className="shrink-0 text-[10px]">
              created
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
