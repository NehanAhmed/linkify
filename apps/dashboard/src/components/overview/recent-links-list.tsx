import { useState } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import type { ShortUrl } from "@linkify/shared"

interface RecentLinksListProps {
  urls: ShortUrl[]
  totalUrls: number
}

function truncateUrl(url: string, max = 50): string {
  if (url.length <= max) return url
  return url.slice(0, max) + "..."
}

export default function RecentLinksList({ urls, totalUrls }: RecentLinksListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = async (shortUrl: string, code: string) => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setCopiedCode(code)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  if (urls.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Links</CardTitle>
        <Link to="/urls">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View all
            <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-3 font-medium">Short Link</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Destination</th>
                <th className="px-5 py-3 font-medium text-right">Visits</th>
                <th className="px-5 py-3 font-medium text-right hidden md:table-cell">Created</th>
                <th className="px-5 py-3 font-medium text-right"></th>
              </tr>
            </thead>
            <tbody>
              {urls.map((url) => (
                <tr key={url.code} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      to={`/urls/${url.code}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {url.code}
                    </Link>
                    {url.hasPassword && (
                      <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">
                        locked
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <span
                      className="inline-block max-w-[200px] truncate text-sm text-muted-foreground"
                      title={url.url}
                    >
                      {truncateUrl(url.url)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm tabular-nums text-foreground">
                    {url.visits}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-muted-foreground hidden md:table-cell tabular-nums">
                    {formatDistanceToNow(new Date(url.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleCopy(url.shortUrl, url.code)}
                        title="Copy short URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <a
                        href={url.shortUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
