import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { bulkCreateUrls } from "@/lib/api"
import type { BulkResult } from "@linkify/shared"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, CheckCircle, XCircle } from "lucide-react"
import CopyButton from "@/components/copy-button"

function BulkResultSuccess({ result }: { result: BulkResult }) {
  const data = result.data as Record<string, string> | undefined
  const shortUrl = data?.shortUrl
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm font-medium text-primary">
        {shortUrl ?? result.code ?? "—"}
      </span>
      {shortUrl && (
        <CopyButton text={shortUrl} variant="ghost" size="icon" />
      )}
    </div>
  )
}

export default function BulkCreatePage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const navigate = useNavigate()

  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BulkResult[] | null>(null)

  interface ParsedLine {
    original: string
    url: string
    customCode?: string
    valid: boolean
  }

  const urls = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const validUrls: ParsedLine[] = urls.map((line) => {
    const parts = line.split("|").map((s) => s.trim())
    const rawUrl = parts[0]
    const customCode = parts.length > 1 ? parts[1] : undefined
    try {
      const fullUrl = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`
      new URL(fullUrl)
      return { original: line, url: fullUrl, customCode, valid: true }
    } catch {
      return { original: line, url: "", valid: false }
    }
  })

  const validCount = validUrls.filter((u) => u.valid).length
  const invalidCount = validUrls.filter((u) => !u.valid).length

  const handleSubmit = async () => {
    if (validCount === 0) {
      toast.error("No valid URLs to create")
      return
    }

    if (validCount > 50) {
      toast.error("Maximum 50 URLs per batch")
      return
    }

    setLoading(true)
    try {
      const payload = validUrls.filter((u) => u.valid).map((u) => ({
        url: u.url,
        ...(u.customCode ? { customCode: u.customCode } : {}),
      }))
      const data = await bulkCreateUrls(token, payload)
      setResults(data)
      const successCount = data.filter((r) => r.success).length
      toast.success(`${successCount} of ${data.length} URLs created successfully`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create URLs"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setInput("")
    setResults(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Create"
        description="Create multiple short links at once"
        actions={
          results && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Create another batch
            </Button>
          )
        }
      />

      {!results ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="urls">Enter URLs (one per line)</Label>
              <p className="text-xs text-muted-foreground">
                Optionally append <span className="font-mono">|customCode</span> per line to set a custom short code.
              </p>
              <Textarea
                id="urls"
                placeholder={`https://example.com/page1\nhttps://example.com/page2|custom-code\nhttps://example.com/page3`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {urls.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {urls.length} URL{urls.length !== 1 ? "s" : ""} detected
                </span>
                {validCount > 0 && (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {validCount} valid
                  </Badge>
                )}
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={handleSubmit} disabled={loading || validCount === 0} size="lg">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {loading ? "Creating..." : `Create ${validCount} URL${validCount !== 1 ? "s" : ""}`}
              </Button>
              <Button variant="outline" onClick={() => navigate("/urls")}>
                Cancel
              </Button>
            </div>

            {invalidCount > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive">Invalid URLs:</p>
                <ul className="mt-1 list-inside list-disc text-xs text-destructive/80">
                  {validUrls.filter((u) => !u.valid).map((u, i) => (
                    <li key={i}>{u.original}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                Results
              </span>
              <Badge variant="success">
                {results.filter((r) => r.success).length} succeeded
              </Badge>
              {results.some((r) => !r.success) && (
                <Badge variant="destructive">
                  {results.filter((r) => !r.success).length} failed
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              {results.map((result, i) => {
                const originalUrl = result.index !== undefined ? validUrls[result.index]?.original : validUrls[i]?.original
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0">
                        {result.success ? (
                          <BulkResultSuccess result={result} />
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {result.error ?? "Unknown error"}
                          </span>
                        )}
                        {originalUrl && (
                          <p className="text-xs text-muted-foreground truncate max-w-[300px] mt-0.5">
                            {originalUrl}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <Button className="mt-4" onClick={() => navigate("/urls")}>
              View all URLs
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
