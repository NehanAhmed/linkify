import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  getCollection,
  updateCollection,
  deleteCollection,
  getCollectionUrls,
  addUrlToCollection,
  removeUrlFromCollection,
  shareCollection,
  revokeCollectionShare,
  listUrls,
  ApiError,
} from "@/lib/api"
import type { Collection, ShortUrl, Pagination } from "@linkify/shared"
import { toast } from "sonner"
import { useParams, useNavigate, Link } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import TablePagination from "@/components/ui/pagination"
import { format } from "date-fns"
import {
  ArrowLeft,
  Link as LinkIcon,
  Trash2,
  Pencil,
  Plus,
  X,
  Loader2,
  List,
  ExternalLink,
  Check,
  Share2,
  Globe,
} from "lucide-react"

function getAddErrorMsg(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "URL_NOT_FOUND") return "No link found with that code. Check the code and try again."
    if (err.message?.toLowerCase().includes("already")) return "This URL is already in the collection."
    return "Could not add the URL. Please check the code and try again."
  }
  return "Could not add the URL. Please check the code and try again."
}

export default function CollectionDetailPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const collectionId = Number(id)

  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)

  const [urlCodes, setUrlCodes] = useState<string[]>([])
  const [urlsPagination, setUrlsPagination] = useState<Pagination | null>(null)
  const [urlsPage, setUrlsPage] = useState(1)
  const [urlsLoading, setUrlsLoading] = useState(false)

  const [addCode, setAddCode] = useState("")
  const [adding, setAdding] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editing, setEditing] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [selectOpen, setSelectOpen] = useState(false)
  const [availableUrls, setAvailableUrls] = useState<ShortUrl[]>([])
  const [availablePagination, setAvailablePagination] = useState<Pagination | null>(null)
  const [availablePage, setAvailablePage] = useState(1)
  const [availableLoading, setAvailableLoading] = useState(false)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set())
  const [addingSelected, setAddingSelected] = useState(false)
  const [selectSearch, setSelectSearch] = useState("")

  const [sharing, setSharing] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)

  const fetchCollection = useCallback(async () => {
    if (!token || !collectionId) return
    try {
      const data = await getCollection(token, collectionId)
      setCollection(data)
    } catch {
      toast.error("Collection not found")
      navigate("/collections")
    }
  }, [token, collectionId, navigate])

  const fetchUrls = useCallback(
    async (page = 1) => {
      if (!token || !collectionId) return
      setUrlsLoading(true)
      try {
        const data = await getCollectionUrls(token, collectionId, { page, limit: 10 })
        setUrlCodes(data.urlCodes)
        setUrlsPagination(data.pagination)
        setUrlsPage(page)
      } catch {
        toast.error("Failed to load collection URLs")
      } finally {
        setUrlsLoading(false)
      }
    },
    [token, collectionId]
  )

  const fetchAvailable = useCallback(
    async (page = 1, query = "") => {
      if (!token) return
      setAvailableLoading(true)
      try {
        const params: Record<string, string> = { page: String(page), limit: "10", sortBy: "createdAt", sortOrder: "desc" }
        if (query) params.q = query
        const data = await listUrls(token, params)
        setAvailableUrls(data.urls)
        setAvailablePagination(data.pagination)
        setAvailablePage(page)
      } catch {
        toast.error("Failed to load URLs")
      } finally {
        setAvailableLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    if (!token || !collectionId) return
    setLoading(true)
    Promise.all([fetchCollection(), fetchUrls(1)]).finally(() => setLoading(false))
  }, [token, collectionId, fetchCollection, fetchUrls])

  useEffect(() => {
    if (selectOpen) {
      setSelectedCodes(new Set())
      setSelectSearch("")
      fetchAvailable(1)
    }
  }, [selectOpen, fetchAvailable])

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast.error("Name is required")
      return
    }
    setEditing(true)
    try {
      await updateCollection(token, collectionId, { name: editName.trim() })
      toast.success("Collection updated")
      setEditOpen(false)
      fetchCollection()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update collection"
      toast.error(msg)
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteCollection(token, collectionId)
      toast.success("Collection deleted")
      navigate("/collections")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete collection"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const handleAddUrl = async () => {
    const code = addCode.trim()
    if (!code) {
      toast.error("Enter a URL code")
      return
    }
    if (!/^[a-zA-Z0-9_-]{3,16}$/.test(code)) {
      toast.error("Invalid code format. Codes are 3–16 alphanumeric characters.")
      return
    }
    setAdding(true)
    try {
      await addUrlToCollection(token, collectionId, code)
      toast.success("URL added to collection")
      setAddCode("")
      fetchUrls(urlsPage)
    } catch (err: unknown) {
      toast.error(getAddErrorMsg(err))
    } finally {
      setAdding(false)
    }
  }

  const handleAddSelected = async () => {
    if (selectedCodes.size === 0) return
    setAddingSelected(true)
    let success = 0
    let failed = 0
    for (const code of selectedCodes) {
      try {
        await addUrlToCollection(token, collectionId, code)
        success++
      } catch {
        failed++
      }
    }
    if (failed === 0) {
      toast.success(`${success} URL${success > 1 ? "s" : ""} added to collection`)
    } else {
      toast.success(`${success} added, ${failed} failed`)
    }
    setSelectOpen(false)
    setSelectedCodes(new Set())
    fetchUrls(1)
  }

  const handleRemoveUrl = async (code: string) => {
    try {
      await removeUrlFromCollection(token, collectionId, code)
      toast.success("URL removed from collection")
      fetchUrls(urlsPage)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove URL"
      toast.error(msg)
    }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      const data = await shareCollection(token, collectionId)
      setCollection((prev) => prev ? { ...prev, shareToken: data.shareToken, sharedAt: new Date().toISOString() } : null)
      toast.success("Share link generated")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate share link"
      toast.error(msg)
    } finally {
      setSharing(false)
    }
  }

  const handleRevokeShare = async () => {
    setRevoking(true)
    try {
      await revokeCollectionShare(token, collectionId)
      setCollection((prev) => prev ? { ...prev, shareToken: null, sharedAt: null } : null)
      toast.success("Share link revoked")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke share link"
      toast.error(msg)
    } finally {
      setRevoking(false)
    }
  }

  const handleCopyShare = async () => {
    if (!collection?.shareToken) return
    const shareUrl = `${window.location.origin}/collections/shared/${collection.shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedShare(true)
      setTimeout(() => setCopiedShare(false), 2000)
      toast.success("Share URL copied")
    } catch {
      toast.error("Failed to copy")
    }
  }

  const toggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    )
  }

  if (!collection) return null

  return (
    <div className="space-y-6">
      <PageHeader
        title={collection.name}
        description={
          collection.createdAt
            ? `Created ${format(new Date(collection.createdAt), "MMM d, yyyy")} · ${collection.urlCount ?? 0} URLs`
            : undefined
        }
        actions={
          <div className="flex gap-2">
            <Link to="/collections">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Collections
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditOpen(true); setEditName(collection.name) }}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        }
      />

      {/* URLs Section */}
      <Card>
        <CardHeader>
          <CardTitle>URLs in this collection</CardTitle>
          <CardDescription>Add or remove short links from this collection.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add URL form */}
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="add-url-code">URL code</Label>
                <Input
                  id="add-url-code"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  placeholder="e.g. aB3xK9m"
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                />
              </div>
              <Button size="sm" onClick={handleAddUrl} disabled={adding || !addCode.trim()}>
                {adding ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                {adding ? "Adding..." : "Add"}
              </Button>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectOpen(true)}>
              <List className="mr-1.5 h-4 w-4" />
              Select from your existing URLs
            </Button>
          </div>

          {/* URLs list */}
          {urlsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : urlCodes.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <LinkIcon className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No URLs in this collection yet.</p>
              <p className="text-xs text-muted-foreground">Add a URL code above or select from your existing URLs.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {urlCodes.map((code) => (
                <div
                  key={code}
                  className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5"
                >
                  <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <Link
                    to={`/urls/${code}`}
                    className="flex-1 font-mono text-sm font-medium text-primary hover:underline"
                  >
                    {code}
                  </Link>
                  <button
                    onClick={() => handleRemoveUrl(code)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove from collection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {urlsPagination && urlsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {urlsPagination.total} URL{urlsPagination.total !== 1 ? "s" : ""} total
              </span>
              <TablePagination
                page={urlsPagination.page}
                totalPages={urlsPagination.totalPages}
                onPageChange={(p) => fetchUrls(p)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share Section */}
      <Card>
        <CardHeader>
          <CardTitle>Share Collection</CardTitle>
          <CardDescription>Generate a shareable link for this collection.</CardDescription>
        </CardHeader>
        <CardContent>
          {collection.shareToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-sm font-mono text-foreground">
                  {`${window.location.origin}/collections/shared/${collection.shareToken}`}
                </span>
                <Button variant="outline" size="sm" className="shrink-0 h-8 gap-1.5" onClick={handleCopyShare}>
                  {copiedShare ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Globe className="h-3.5 w-3.5" />
                  )}
                  {copiedShare ? "Copied" : "Copy"}
                </Button>
              </div>
              {collection.sharedAt && (
                <p className="text-xs text-muted-foreground">
                  Shared {format(new Date(collection.sharedAt), "MMM d, yyyy HH:mm")}
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handleRevokeShare} disabled={revoking}>
                {revoking ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-4 w-4" />
                )}
                {revoking ? "Revoking..." : "Revoke Share"}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={handleShare} disabled={sharing}>
              {sharing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="mr-1.5 h-4 w-4" />
              )}
              {sharing ? "Generating..." : "Generate Share Link"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Select from existing URLs modal */}
      <Dialog open={selectOpen} onClose={() => setSelectOpen(false)}>
        <DialogHeader>
          <DialogTitle>Select URLs</DialogTitle>
          <DialogDescription>Choose URLs from your account to add to this collection.</DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2 space-y-3">
          <Input
            value={selectSearch}
            onChange={(e) => setSelectSearch(e.target.value)}
            placeholder="Search by code or URL..."
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchAvailable(1, selectSearch)
            }}
          />
          {availableLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : availableUrls.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No URLs found.</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {availableUrls.map((url) => (
                <label
                  key={url.code}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/30 ${
                    selectedCodes.has(url.code) ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCodes.has(url.code)}
                    onChange={() => toggleSelect(url.code)}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium text-foreground">{url.code}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{url.url}</span>
                    </div>
                  </div>
                  {url.visits > 0 && (
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {url.visits} visit{url.visits !== 1 ? "s" : ""}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
          {availablePagination && availablePagination.totalPages > 1 && (
            <div className="flex justify-center pt-1">
              <TablePagination
                page={availablePagination.page}
                totalPages={availablePagination.totalPages}
                onPageChange={(p) => fetchAvailable(p, selectSearch)}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setSelectOpen(false)} disabled={addingSelected}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={selectedCodes.size === 0 || addingSelected}>
            {addingSelected ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" />
            )}
            {addingSelected
              ? "Adding..."
              : `Add ${selectedCodes.size} selected`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>Update the collection name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 px-6 pb-2">
          <Label htmlFor="edit-detail-name">Name</Label>
          <Input
            id="edit-detail-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing}>
            Cancel
          </Button>
          <Button onClick={handleEdit} disabled={editing || !editName.trim()}>
            {editing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Pencil className="mr-1.5 h-4 w-4" />}
            {editing ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete collection</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{collection.name}</span>?
            URLs within this collection will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
