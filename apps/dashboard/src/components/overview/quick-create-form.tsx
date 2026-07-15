import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ShortUrl } from "@linkify/shared"

interface QuickCreateFormProps {
  onShorten: (url: string) => Promise<ShortUrl>
}

export default function QuickCreateForm({ onShorten }: QuickCreateFormProps) {
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ShortUrl | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    let normalized = url.trim()
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`
    }

    setLoading(true)
    setResult(null)

    try {
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
          <Button type="submit" disabled={loading || !url.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Shorten"
            )}
          </Button>
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
