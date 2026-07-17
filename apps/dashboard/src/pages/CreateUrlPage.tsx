import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createUrl, listTags, listCollections } from "@/lib/api"
import type { Tag, Collection, ShortUrl } from "@linkify/shared"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import CopyButton from "@/components/copy-button"
import { Link2, CheckCircle, Loader2, Plus, X } from "lucide-react"

function normalizeUrl(url: string): string {
  if (!url.trim()) return ""
  const normalized = url.startsWith("http") ? url : `https://${url}`
  try {
    const parsed = new URL(normalized)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return ""
    return normalized
  } catch {
    return ""
  }
}

const TTL_PRESETS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
  { label: "Never", value: 0 },
] as const

interface FormState {
  url: string
  customCode: string
  ttlDays: string
  password: string
  activeAt: string
  activeTime: string
  qrExpiresAt: string
  qrExpiresTime: string
  blockBots: boolean
  tags: string[]
  collectionId: string
}

const initialForm: FormState = {
  url: "",
  customCode: "",
  ttlDays: "",
  password: "",
  activeAt: "",
  activeTime: "",
  qrExpiresAt: "",
  qrExpiresTime: "",
  blockBots: false,
  tags: [],
  collectionId: "",
}

export default function CreateUrlPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(initialForm)
  const [tags, setTags] = useState<Tag[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<ShortUrl | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tagInput, setTagInput] = useState("")

  useEffect(() => {
    if (!token) return
    Promise.all([
      listTags(token).catch(() => ({ tags: [] as Tag[], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
      listCollections(token).catch(() => ({ collections: [] as Collection[], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } })),
    ]).then(([tagsData, collectionsData]) => {
      setTags(tagsData.tags)
      setCollections(collectionsData.collections)
    })
  }, [token])

  const updateField = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: "" }))
  }

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim().toLowerCase()
    if (!trimmed || form.tags.includes(trimmed)) return
    if (form.tags.length >= 10) {
      toast.error("Maximum 10 tags allowed")
      return
    }
    setForm((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }))
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}

    if (!form.url.trim()) {
      errs.url = "URL is required"
    } else if (!normalizeUrl(form.url)) {
      errs.url = "Invalid URL"
    }

    if (form.customCode) {
      if (form.customCode.length < 3 || form.customCode.length > 16) {
        errs.customCode = "Custom code must be 3-16 characters"
      } else if (!/^[a-zA-Z0-9_-]+$/.test(form.customCode)) {
        errs.customCode = "Custom code can only contain letters, numbers, hyphens, and underscores"
      }
    }

    if (form.password && (form.password.length < 4 || form.password.length > 128)) {
      errs.password = "Password must be 4-128 characters"
    }

    const ttl = Number(form.ttlDays)
    if (form.ttlDays && ttl !== 0 && (ttl < 1 || ttl > 365)) {
      errs.ttlDays = "TTL must be between 1 and 365 days"
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      let activeAt: string | undefined
      if (form.activeAt) {
        const dateStr = form.activeTime ? `${form.activeAt}T${form.activeTime}:00` : `${form.activeAt}T00:00:00`
        activeAt = new Date(dateStr).toISOString()
      }

      let qrExpiresAt: string | undefined | null
      if (form.qrExpiresAt) {
        const dateStr = form.qrExpiresTime ? `${form.qrExpiresAt}T${form.qrExpiresTime}:00` : `${form.qrExpiresAt}T00:00:00`
        qrExpiresAt = new Date(dateStr).toISOString()
      }

      const result = await createUrl(token, {
        url: normalizeUrl(form.url),
        customCode: form.customCode || undefined,
        ttlDays: form.ttlDays ? Number(form.ttlDays) : undefined,
        password: form.password || undefined,
        activeAt,
        qrExpiresAt,
        blockBots: form.blockBots,
        tags: form.tags.length > 0 ? form.tags : undefined,
        collectionId: form.collectionId ? Number(form.collectionId) : undefined,
      })

      setCreated(result)
      toast.success("URL created successfully!")
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string }
      if (apiErr.code === "CODE_TAKEN" || apiErr.code === "RESERVED_CODE") {
        setErrors((prev) => ({ ...prev, customCode: apiErr.message || "Code not available" }))
      } else if (apiErr.code === "INVALID_URL" || apiErr.code === "INVALID_PROTOCOL") {
        setErrors((prev) => ({ ...prev, url: apiErr.message || "Invalid URL" }))
      } else if (apiErr.code === "PLAN_LIMIT_REACHED") {
        toast.error(apiErr.message || "Plan limit reached")
      } else if (apiErr.code === "FEATURE_NOT_AVAILABLE") {
        toast.error(apiErr.message || "Feature not available on your plan")
      } else {
        toast.error(apiErr.message || "Failed to create URL")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAnother = () => {
    setForm(initialForm)
    setCreated(null)
    setErrors({})
  }

  if (created) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="URL Created"
          description="Your short link is ready"
        />
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">Link created successfully</h2>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-6 py-4">
              <span className="text-lg font-mono font-medium text-primary">{created.shortUrl}</span>
              <CopyButton text={created.shortUrl} variant="primary" size="sm" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Destination: {created.url}
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={handleCreateAnother}>
                <Plus className="mr-1.5 h-4 w-4" />
                Create another
              </Button>
              <Button onClick={() => navigate(`/urls/${created.code}`)}>
                View details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create URL"
        description="Shorten a new link"
      />

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* URL */}
            <div className="space-y-1.5">
              <Label htmlFor="url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                placeholder="https://example.com/very-long-url"
                value={form.url}
                onChange={(e) => updateField("url", e.target.value)}
              />
              {errors.url && <p className="text-xs text-destructive">{errors.url}</p>}
            </div>

            {/* Custom code */}
            <div className="space-y-1.5">
              <Label htmlFor="customCode">Custom code (optional)</Label>
              <Input
                id="customCode"
                placeholder="my-custom-link"
                value={form.customCode}
                onChange={(e) => updateField("customCode", e.target.value)}
              />
              {errors.customCode && <p className="text-xs text-destructive">{errors.customCode}</p>}
              <p className="text-xs text-muted-foreground">
                3-16 characters: letters, numbers, hyphens, underscores
              </p>
            </div>

            {/* TTL */}
            <div className="space-y-1.5">
              <Label>Expiry (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {TTL_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant={form.ttlDays === String(preset.value) ? "primary" : "outline"}
                    size="sm"
                    onClick={() => updateField("ttlDays", String(preset.value))}
                  >
                    {preset.label}
                  </Button>
                ))}
                <Input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Custom"
                  value={form.ttlDays && !TTL_PRESETS.some((p) => p.value === Number(form.ttlDays)) ? form.ttlDays : ""}
                  onChange={(e) => updateField("ttlDays", e.target.value)}
                  className="w-24 h-8 text-sm"
                />
              </div>
              {errors.ttlDays && <p className="text-xs text-destructive">{errors.ttlDays}</p>}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password protection (optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Set a password to protect this link"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              <p className="text-xs text-muted-foreground">
                4-128 characters. Requires a plan with password protection.
              </p>
            </div>

            {/* Active at */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="activeAt">Schedule activation (optional)</Label>
                <Input
                  id="activeAt"
                  type="date"
                  value={form.activeAt}
                  onChange={(e) => updateField("activeAt", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activeTime">Time (optional)</Label>
                <Input
                  id="activeTime"
                  type="time"
                  value={form.activeTime}
                  onChange={(e) => updateField("activeTime", e.target.value)}
                />
              </div>
            </div>

            {/* QR Expires at */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="qrExpiresAt">QR code expires at (optional)</Label>
                <Input
                  id="qrExpiresAt"
                  type="date"
                  value={form.qrExpiresAt}
                  onChange={(e) => updateField("qrExpiresAt", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qrExpiresTime">Time (optional)</Label>
                <Input
                  id="qrExpiresTime"
                  type="time"
                  value={form.qrExpiresTime}
                  onChange={(e) => updateField("qrExpiresTime", e.target.value)}
                />
              </div>
            </div>

            {/* Block bots */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="block-bots" className="text-sm font-medium">Block bots</Label>
                <p className="text-xs text-muted-foreground">Prevent automated crawlers from accessing this link</p>
              </div>
              <Switch
                id="block-bots"
                checked={form.blockBots}
                onCheckedChange={(checked) => updateField("blockBots", checked)}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>Tags (optional)</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type tag name and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => addTag(tagInput)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {tags.filter((t) => !form.tags.includes(t.name)).slice(0, 10).map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => addTag(tag.name)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Collection */}
            <div className="space-y-1.5">
              <Label htmlFor="collection">Collection (optional)</Label>
              <select
                id="collection"
                value={form.collectionId}
                onChange={(e) => updateField("collectionId", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary appearance-none"
              >
                <option value="">No collection</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={loading} size="lg">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating..." : "Create URL"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/urls")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
