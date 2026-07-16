import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { createApiKey, listApiKeys, updateApiKey, revokeApiKey } from "@/lib/api"
import type { ApiKey } from "@linkify/shared"
import { toast } from "sonner"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import CopyButton from "@/components/copy-button"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { KeyRound, Plus, Pencil, Trash2, Loader2 } from "lucide-react"

const SCOPE_OPTIONS = [
  { value: "urls:read", label: "URLs Read" },
  { value: "urls:write", label: "URLs Write" },
  { value: "urls:delete", label: "URLs Delete" },
  { value: "analytics:read", label: "Analytics Read" },
]

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Never"
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

const COOLDOWN_SECONDS = 20

export default function ApiKeysPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""

  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createScopes, setCreateScopes] = useState<string[]>([])
  const [createIps, setCreateIps] = useState<string[]>([])
  const [createIpInput, setCreateIpInput] = useState("")
  const [createExpiresAt, setCreateExpiresAt] = useState("")
  const [creating, setCreating] = useState(false)

  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null)

  const [editTarget, setEditTarget] = useState<ApiKey | null>(null)
  const [editName, setEditName] = useState("")
  const [editScopes, setEditScopes] = useState<string[]>([])
  const [editIps, setEditIps] = useState<string[]>([])
  const [editIpInput, setEditIpInput] = useState("")
  const [editExpiresAt, setEditExpiresAt] = useState("")
  const [editing, setEditing] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<ApiKey | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const data = await listApiKeys(token)
      setKeys(data)
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleScope = (scopes: string[], setScopes: (v: string[]) => void, value: string) => {
    setScopes(
      scopes.includes(value)
        ? scopes.filter((s) => s !== value)
        : [...scopes, value]
    )
  }

  const addIp = (ips: string[], setIps: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (ips.includes(trimmed)) return
    setIps([...ips, trimmed])
    setInput("")
  }

  const removeIp = (ips: string[], setIps: (v: string[]) => void, idx: number) => {
    setIps(ips.filter((_, i) => i !== idx))
  }

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error("Name is required"); return }
    setCreating(true)
    try {
      const result = await createApiKey(token, {
        name: createName.trim(),
        scopes: createScopes.length > 0 ? createScopes : undefined,
        allowedIps: createIps.length > 0 ? createIps : undefined,
        expiresAt: createExpiresAt ? new Date(createExpiresAt).toISOString() : undefined,
      })
      setNewKey({ key: result.key, name: result.name })
      setCreateOpen(false)
      setCreateName("")
      setCreateScopes([])
      setCreateIps([])
      setCreateIpInput("")
      setCreateExpiresAt("")
      startCooldown()
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create API key"
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    if (!editName.trim()) { toast.error("Name is required"); return }
    setEditing(true)
    try {
      await updateApiKey(token, editTarget.id, {
        name: editName.trim(),
        scopes: editScopes.length > 0 ? editScopes : undefined,
        allowedIps: editIps.length > 0 ? editIps : undefined,
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : undefined,
      })
      toast.success("API key updated")
      setEditTarget(null)
      startCooldown()
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update API key"
      toast.error(msg)
    } finally {
      setEditing(false)
    }
  }

  const handleRevoke = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await revokeApiKey(token, deleteTarget.id)
      toast.success("API key revoked")
      setDeleteTarget(null)
      startCooldown()
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke API key"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const onCooldown = cooldown > 0

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="API Keys"
        description="Create and manage programmatic API access keys."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={onCooldown}>
            {onCooldown ? (
              <span className="tabular-nums">{cooldown}s</span>
            ) : (
              <><Plus className="mr-1.5 h-4 w-4" />New key</>
            )}
          </Button>
        }
      />

      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <KeyRound className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-medium text-foreground">No API keys yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first key to access the API programmatically.
          </p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)} disabled={onCooldown}>
            {onCooldown ? (
              <span className="tabular-nums">{cooldown}s</span>
            ) : (
              <><Plus className="mr-1.5 h-4 w-4" />Create key</>
            )}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Scopes</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">IP Allowlist</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Last used</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => {
                const expired = isExpired(key.expiresAt)
                return (
                  <tr key={key.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{key.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes && key.scopes.length > 0 ? (
                          key.scopes.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[11px] font-mono">
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">All</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {key.allowedIps && key.allowedIps.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {key.allowedIps.map((ip) => (
                            <Badge key={ip} variant="outline" className="text-[11px] font-mono">
                              {ip}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Any IP</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {formatDate(key.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {formatDate(key.expiresAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={expired ? "secondary" : "default"} className="text-xs">
                        {expired ? "Expired" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditTarget(key)
                            setEditName(key.name)
                            setEditScopes(key.scopes ?? [])
                            setEditIps(key.allowedIps ?? [])
                            setEditIpInput("")
                            setEditExpiresAt(formatDateTime(key.expiresAt))
                          }}
                          disabled={onCooldown}
                          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(key)}
                          disabled={onCooldown}
                          className="p-1.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {onCooldown && (
        <p className="text-xs text-muted-foreground text-center">
          Rate limit: {cooldown}s before next API key change
        </p>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreateName(""); setCreateScopes([]); setCreateIps([]); setCreateIpInput(""); setCreateExpiresAt("") }}>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>Generate a new API key for programmatic access.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Name</Label>
            <Input id="create-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. CI/CD pipeline" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Scopes</Label>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={createScopes.includes(opt.value)}
                    onCheckedChange={() => toggleScope(createScopes, setCreateScopes, opt.value)}
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{opt.value}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-ips">Allowed IPs (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="create-ips"
                value={createIpInput}
                onChange={(e) => setCreateIpInput(e.target.value)}
                placeholder="e.g. 203.0.113.0/24"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addIp(createIps, setCreateIps, createIpInput, setCreateIpInput)
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={() => addIp(createIps, setCreateIps, createIpInput, setCreateIpInput)}>Add</Button>
            </div>
            {createIps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {createIps.map((ip, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1">
                    {ip}
                    <button onClick={() => removeIp(createIps, setCreateIps, i)} className="text-muted-foreground hover:text-foreground ml-0.5">&times;</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-expires">Expires at (optional)</Label>
            <Input id="create-expires" type="datetime-local" value={createExpiresAt} onChange={(e) => setCreateExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateName(""); setCreateScopes([]); setCreateIps([]); setCreateIpInput(""); setCreateExpiresAt("") }} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Key Reveal Dialog */}
      <Dialog open={!!newKey} onClose={() => {}}>
        <DialogHeader>
          <DialogTitle>API key created</DialogTitle>
          <DialogDescription>
            Your new key is ready. <strong className="text-foreground">Copy it now — you won't be able to see it again.</strong>
          </DialogDescription>
        </DialogHeader>
        {newKey && (
          <div className="px-6 pb-2 space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <code className="flex-1 text-sm font-mono text-foreground break-all select-all">
                {newKey.key}
              </code>
              <CopyButton text={newKey.key} />
            </div>
            <p className="text-xs text-destructive/80">
              Warning: This key will only be shown once. If you lose it, you'll need to create a new one.
            </p>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => setNewKey(null)}>
            I've copied the key
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)}>
        <DialogHeader>
          <DialogTitle>Edit API key</DialogTitle>
          <DialogDescription>Update the key name, scopes, or restrictions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Scopes</Label>
            <div className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editScopes.includes(opt.value)}
                    onCheckedChange={() => toggleScope(editScopes, setEditScopes, opt.value)}
                  />
                  <span className="text-sm text-foreground">{opt.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{opt.value}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-ips">Allowed IPs (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="edit-ips"
                value={editIpInput}
                onChange={(e) => setEditIpInput(e.target.value)}
                placeholder="e.g. 203.0.113.0/24"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addIp(editIps, setEditIps, editIpInput, setEditIpInput)
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={() => addIp(editIps, setEditIps, editIpInput, setEditIpInput)}>Add</Button>
            </div>
            {editIps.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {editIps.map((ip, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pr-1">
                    {ip}
                    <button onClick={() => removeIp(editIps, setEditIps, i)} className="text-muted-foreground hover:text-foreground ml-0.5">&times;</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-expires">Expires at (optional)</Label>
            <Input id="edit-expires" type="datetime-local" value={editExpiresAt} onChange={(e) => setEditExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editing}>
            Cancel
          </Button>
          <Button onClick={handleEdit} disabled={editing || !editName.trim()}>
            {editing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Pencil className="mr-1.5 h-4 w-4" />}
            {editing ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>Revoke API key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            This will immediately invalidate this key.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleRevoke} disabled={deleting}>
            {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {deleting ? "Revoking..." : "Revoke"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
