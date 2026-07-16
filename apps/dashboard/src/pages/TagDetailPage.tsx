import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getTagUrls, updateTag, deleteTag } from "@/lib/api"
import type { Tag, Pagination } from "@linkify/shared"
import { toast } from "sonner"
import { useParams, Link, useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import TablePagination from "@/components/ui/pagination"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import ColorPicker from "@/components/color-picker"
import { listTags } from "@/lib/api"
import { ExternalLink, Pencil, Trash2, Loader2, ArrowLeft, Hash } from "lucide-react"

export default function TagDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const navigate = useNavigate()
  const tagId = Number(id)

  const [tag, setTag] = useState<Tag | null>(null)
  const [urlCodes, setUrlCodes] = useState<string[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editing, setEditing] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token || !tagId) return
    setLoading(true)
    try {
      const [urlsData, tagsData] = await Promise.all([
        getTagUrls(token, tagId, { page, limit: 10 }),
        listTags(token, { page: 1, limit: 100 }),
      ])
      const found = tagsData.tags.find((t) => t.id === tagId)
      if (found) setTag(found)
      setUrlCodes(urlsData.urlCodes)
      setPagination(urlsData.pagination)
    } catch {
      toast.error("Failed to load tag details")
    } finally {
      setLoading(false)
    }
  }, [token, tagId, page])

  useEffect(() => { if (tagId) fetchData() }, [fetchData, tagId])

  const handleEdit = async () => {
    if (!tag || !editName.trim()) { toast.error("Name is required"); return }
    setEditing(true)
    try {
      await updateTag(token, tag.id, { name: editName.trim(), color: editColor })
      toast.success("Tag updated")
      setEditOpen(false)
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update tag"
      toast.error(msg)
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!tag) return
    setDeleting(true)
    try {
      await deleteTag(token, tag.id)
      toast.success("Tag deleted")
      navigate("/tags")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete tag"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!tag) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Hash className="h-10 w-10 text-muted-foreground/50" />
        <h3 className="mt-4 text-base font-medium text-foreground">Tag not found</h3>
        <Link to="/tags"><Button variant="outline" size="sm" className="mt-4">Back to tags</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link to="/tags" className="hover:text-foreground transition-colors">Tags</Link>
        <span>/</span>
        <span className="text-foreground">{tag.name}</span>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full" style={{ backgroundColor: tag.color }} />
          <div>
            <h2 className="text-lg font-semibold text-foreground">{tag.name}</h2>
            <p className="text-sm text-muted-foreground">{pagination?.total ?? 0} URLs</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditOpen(true); setEditName(tag.name); setEditColor(tag.color) }}>
            <Pencil className="mr-1.5 h-4 w-4" />Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-1.5 h-4 w-4" />Delete
          </Button>
        </div>
      </div>

      {urlCodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ExternalLink className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-medium text-foreground">No URLs with this tag</h3>
          <p className="mt-1 text-sm text-muted-foreground">Tag some URLs to see them here.</p>
          <Link to="/urls"><Button variant="outline" size="sm" className="mt-4">Browse URLs</Button></Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Destination</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {urlCodes.map((code) => (
                <TableRow key={code}>
                  <TableCell>
                    <Link to={`/urls/${code}`} className="font-mono text-sm font-medium text-primary hover:underline">
                      {code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate block max-w-md">{code}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pagination && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <TablePagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit tag</DialogTitle>
          <DialogDescription>Update the tag name or colour.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <ColorPicker value={editColor} onChange={setEditColor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing}>Cancel</Button>
          <Button onClick={handleEdit} disabled={editing || !editName.trim()}>
            {editing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Pencil className="mr-1.5 h-4 w-4" />}
            {editing ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete tag</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{tag?.name}</span>?
            Tags will be removed from all URLs.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
