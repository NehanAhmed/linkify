import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getUrlInfo, updateUrlSettings, setUrlPassword, removeUrlPassword, softDeleteUrl, purgeUrl } from "@/lib/api"
import type { ShortUrl } from "@linkify/shared"
import { toast } from "sonner"
import { useParams, useNavigate, Link } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { format, parseISO } from "date-fns"
import {
  ArrowLeft,
  Save,
  Lock,
  Unlock,
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldOff,
  Key,
  X,
} from "lucide-react"

function toDateValue(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    return format(parseISO(iso), "yyyy-MM-dd")
  } catch {
    return ""
  }
}

function toTimeValue(iso: string | null | undefined): string {
  if (!iso) return ""
  try {
    return format(parseISO(iso), "HH:mm")
  } catch {
    return ""
  }
}

function combineToIso(date: string, time: string): string | null {
  if (!date) return null
  const t = time || "00:00"
  return new Date(`${date}T${t}:00.000Z`).toISOString()
}

export default function UrlSettingsPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  const [urlInfo, setUrlInfo] = useState<ShortUrl | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [activeAtDate, setActiveAtDate] = useState("")
  const [activeAtTime, setActiveAtTime] = useState("")
  const [expiresAtDate, setExpiresAtDate] = useState("")
  const [expiresAtTime, setExpiresAtTime] = useState("")
  const [qrExpiresAtDate, setQrExpiresAtDate] = useState("")
  const [qrExpiresAtTime, setQrExpiresAtTime] = useState("")
  const [blockBots, setBlockBots] = useState(false)

  const [passwordMode, setPasswordMode] = useState<"none" | "set" | "change" | "removing">("none")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [deleteDialog, setDeleteDialog] = useState(false)
  const [purgeDialog, setPurgeDialog] = useState(false)
  const [purgeConfirmCode, setPurgeConfirmCode] = useState("")
  const [deleting, setDeleting] = useState(false)

  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    getUrlInfo(token, code)
      .then((data) => {
        setUrlInfo(data)
        setActiveAtDate(toDateValue(data.activeAt))
        setActiveAtTime(toTimeValue(data.activeAt))
        setExpiresAtDate(toDateValue(data.expiresAt))
        setExpiresAtTime(toTimeValue(data.expiresAt))
        setQrExpiresAtDate(toDateValue(data.qrExpiresAt))
        setQrExpiresAtTime(toTimeValue(data.qrExpiresAt))
        setBlockBots(data.blockBots)
      })
      .catch(() => {
        toast.error("Failed to load link info")
        navigate("/urls")
      })
      .finally(() => setLoading(false))
  }, [code, token, navigate])

  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const initialSettings = useCallback(() => {
    if (!urlInfo) return {}
    return {
      activeAtDate: toDateValue(urlInfo.activeAt),
      activeAtTime: toTimeValue(urlInfo.activeAt),
      expiresAtDate: toDateValue(urlInfo.expiresAt),
      expiresAtTime: toTimeValue(urlInfo.expiresAt),
      qrExpiresAtDate: toDateValue(urlInfo.qrExpiresAt),
      qrExpiresAtTime: toTimeValue(urlInfo.qrExpiresAt),
      blockBots: urlInfo.blockBots,
    }
  }, [urlInfo])

  useEffect(() => {
    if (!urlInfo) return
    const init = initialSettings()
    const changed =
      activeAtDate !== init.activeAtDate ||
      activeAtTime !== init.activeAtTime ||
      expiresAtDate !== init.expiresAtDate ||
      expiresAtTime !== init.expiresAtTime ||
      qrExpiresAtDate !== init.qrExpiresAtDate ||
      qrExpiresAtTime !== init.qrExpiresAtTime ||
      blockBots !== init.blockBots
    setIsDirty(changed)
  }, [urlInfo, initialSettings, activeAtDate, activeAtTime, expiresAtDate, expiresAtTime, qrExpiresAtDate, qrExpiresAtTime, blockBots])

  const handleSave = async () => {
    if (!code) return
    setSaving(true)
    try {
      await updateUrlSettings(token, code, {
        activeAt: combineToIso(activeAtDate, activeAtTime),
        expiresAt: combineToIso(expiresAtDate, expiresAtTime),
        qrExpiresAt: combineToIso(qrExpiresAtDate, qrExpiresAtTime),
        blockBots,
      })
      toast.success("Settings saved")
      setIsDirty(false)
      const info = await getUrlInfo(token, code)
      setUrlInfo(info)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save settings"
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSetPassword = async () => {
    if (!code) return
    if (password.length < 4 || password.length > 128) {
      toast.error("Password must be 4–128 characters")
      return
    }
    if (password !== passwordConfirm) {
      toast.error("Passwords do not match")
      return
    }
    setPasswordLoading(true)
    try {
      await setUrlPassword(token, code, password)
      toast.success("Password set")
      setPasswordMode("none")
      setPassword("")
      setPasswordConfirm("")
      const info = await getUrlInfo(token, code)
      setUrlInfo(info)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to set password"
      if (msg.includes("FEATURE_NOT_AVAILABLE") || msg.includes("feature")) {
        toast.error("Password protection is not available on your current plan")
      } else {
        toast.error(msg)
      }
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleRemovePassword = async () => {
    if (!code) return
    setPasswordLoading(true)
    try {
      await removeUrlPassword(token, code)
      toast.success("Password removed")
      setPasswordMode("none")
      const info = await getUrlInfo(token, code)
      setUrlInfo(info)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove password"
      toast.error(msg)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!code) return
    setDeleting(true)
    try {
      await softDeleteUrl(token, code)
      toast.success("Link deleted")
      navigate("/urls")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const handlePurge = async () => {
    if (!code) return
    setDeleting(true)
    try {
      await purgeUrl(token, code)
      toast.success("Link permanently deleted")
      navigate("/urls")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to purge"
      if (msg.includes("AAL2_REQUIRED") || msg.includes("aal2")) {
        toast.error("Two-factor authentication (AAL2) is required for permanent deletion. Enable 2FA in Supabase settings.")
      } else {
        toast.error(msg)
      }
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  if (!urlInfo) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Link Settings — ${code}`}
        description="Configure scheduling, bot blocking, QR expiry, password, and delete options."
        actions={
          <div className="flex gap-2">
            <Link to={`/urls/${code}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to details
              </Button>
            </Link>
            <Button size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      />

      {/* Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Link Configuration</CardTitle>
          <CardDescription>Update scheduling, bot blocking, and QR code expiry settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Active at</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={activeAtDate}
                  onChange={(e) => { setActiveAtDate(e.target.value); setIsDirty(true) }}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={activeAtTime}
                  onChange={(e) => { setActiveAtTime(e.target.value); setIsDirty(true) }}
                  className="w-[120px]"
                />
                {(activeAtDate || activeAtTime) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => { setActiveAtDate(""); setActiveAtTime(""); setIsDirty(true) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">UTC. Leave empty for immediate activation.</p>
            </div>

            <div className="space-y-2">
              <Label>Expires at</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={expiresAtDate}
                  onChange={(e) => { setExpiresAtDate(e.target.value); setIsDirty(true) }}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={expiresAtTime}
                  onChange={(e) => { setExpiresAtTime(e.target.value); setIsDirty(true) }}
                  className="w-[120px]"
                />
                {(expiresAtDate || expiresAtTime) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => { setExpiresAtDate(""); setExpiresAtTime(""); setIsDirty(true) }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">UTC. Leave empty for no expiry.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>QR code expires at</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={qrExpiresAtDate}
                onChange={(e) => { setQrExpiresAtDate(e.target.value); setIsDirty(true) }}
                className="flex-1"
              />
              <Input
                type="time"
                value={qrExpiresAtTime}
                onChange={(e) => { setQrExpiresAtTime(e.target.value); setIsDirty(true) }}
                className="w-[120px]"
              />
              {(qrExpiresAtDate || qrExpiresAtTime) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => { setQrExpiresAtDate(""); setQrExpiresAtTime(""); setIsDirty(true) }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">UTC. Independent of link expiry date.</p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="block-bots">Block bots</Label>
              <p className="text-xs text-muted-foreground">Prevent known bots and crawlers from accessing this link.</p>
            </div>
            <Switch
              id="block-bots"
              checked={blockBots}
              onCheckedChange={(checked) => { setBlockBots(checked); setIsDirty(true) }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle>Password Protection</CardTitle>
          <CardDescription>
            {urlInfo.hasPassword
              ? "This link is currently password protected."
              : "Protect this link with a password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {urlInfo.hasPassword ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1.5">
                  <Lock className="h-3 w-3" />
                  Password protected
                </Badge>
              </div>
              {passwordMode === "change" ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="4–128 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat the password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSetPassword} disabled={passwordLoading}>
                      {passwordLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Lock className="mr-1.5 h-4 w-4" />}
                      {passwordLoading ? "Saving..." : "Change password"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setPasswordMode("none"); setPassword(""); setPasswordConfirm("") }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : passwordMode === "removing" ? (
                <div className="space-y-3 rounded-lg border border-destructive/30 p-4">
                  <p className="text-sm text-muted-foreground">Are you sure you want to remove the password? The link will become publicly accessible.</p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleRemovePassword} disabled={passwordLoading}>
                      {passwordLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Unlock className="mr-1.5 h-4 w-4" />}
                      {passwordLoading ? "Removing..." : "Remove password"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPasswordMode("none")}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPasswordMode("change")}>
                    <Key className="mr-1.5 h-4 w-4" />
                    Change password
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPasswordMode("removing")}>
                    <Unlock className="mr-1.5 h-4 w-4" />
                    Remove password
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {passwordMode === "set" ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="set-password">Password</Label>
                    <Input
                      id="set-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="4–128 characters"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-set-password">Confirm password</Label>
                    <Input
                      id="confirm-set-password"
                      type="password"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Repeat the password"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSetPassword} disabled={passwordLoading}>
                      {passwordLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Lock className="mr-1.5 h-4 w-4" />}
                      {passwordLoading ? "Setting..." : "Set password"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setPasswordMode("none"); setPassword(""); setPasswordConfirm("") }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setPasswordMode("set")}>
                  <Lock className="mr-1.5 h-4 w-4" />
                  Set password
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
          <CardDescription>Destructive actions that cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Soft delete this link</p>
              <p className="text-xs text-muted-foreground">The link will no longer be accessible. Can be recovered by support.</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Permanently purge this link</p>
              <p className="text-xs text-muted-foreground">
                All visit data, QR codes, and associations will be permanently removed. Requires 2FA.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setPurgeDialog(true)}>
              <ShieldOff className="mr-1.5 h-4 w-4" />
              Purge
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogHeader>
          <DialogTitle>Delete link</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-mono font-medium text-foreground">{code}</span>?
            This link will no longer be accessible. This action can be reversed by support.
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

      {/* Purge Dialog */}
      <Dialog open={purgeDialog} onClose={() => { setPurgeDialog(false); setPurgeConfirmCode("") }}>
        <DialogHeader>
          <DialogTitle>Permanently purge link</DialogTitle>
          <DialogDescription className="space-y-2">
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This will permanently delete this link and all associated visit data, QR codes, and associations. This action cannot be undone.</span>
            </div>
            <p className="pt-2">
              Type <span className="font-mono font-medium text-foreground">{code}</span> to confirm:
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <Input
            value={purgeConfirmCode}
            onChange={(e) => setPurgeConfirmCode(e.target.value)}
            placeholder={code}
            className="font-mono"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setPurgeDialog(false); setPurgeConfirmCode("") }} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handlePurge}
            disabled={purgeConfirmCode !== code || deleting}
          >
            {deleting ? "Purging..." : "Permanently purge"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
