import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { listTags, createTag, updateTag, deleteTag } from "@/lib/api"
import type { Tag } from "@linkify/shared"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import ColorPicker from "@/components/color-picker"
import { Tag as TagIcon, Plus, Pencil, Trash2, Loader2 } from "lucide-react"

async function fetchAllTags(token: string): Promise<Tag[]> {
  const first = await listTags(token, { page: 1, limit: 100 })
  const all = [...first.tags]
  const totalPages = first.pagination.totalPages
  for (let p = 2; p <= totalPages; p++) {
    const page = await listTags(token, { page: p, limit: 100 })
    all.push(...page.tags)
  }
  return all
}

export default function TagsListPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""

  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createColor, setCreateColor] = useState("#6366f1")
  const [creating, setCreating] = useState(false)

  const [editTarget, setEditTarget] = useState<Tag | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editing, setEditing] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const all = await fetchAllTags(token)
      setTags(all)
    } catch {
      toast.error("Failed to load tags")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!createName.trim()) { toast.error("Name is required"); return }
    setCreating(true)
    try {
      await createTag(token, { name: createName.trim(), color: createColor })
      toast.success("Tag created")
      setCreateOpen(false)
      setCreateName("")
      setCreateColor("#6366f1")
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create tag"
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
      await updateTag(token, editTarget.id, { name: editName.trim(), color: editColor })
      toast.success("Tag updated")
      setEditTarget(null)
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update tag"
      toast.error(msg)
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTag(token, deleteTarget.id)
      toast.success("Tag deleted")
      setDeleteTarget(null)
      fetchData()
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tags"
        description="Organise your links with colour-coded tags."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New tag
          </Button>
        }
      />

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <TagIcon className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-medium text-foreground">No tags yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first tag to start organising links.</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create tag
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <Link
                to={`/tags/${tag.id}`}
                className="flex-1 min-w-0 text-sm font-medium text-foreground hover:text-primary truncate"
              >
                {tag.name}
              </Link>
              <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
                {tag.urlCount ?? 0}
              </Badge>
              <button
                onClick={() => { setEditTarget(tag); setEditName(tag.name); setEditColor(tag.color) }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteTarget(tag)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreateName(""); setCreateColor("#6366f1") }}>
        <DialogHeader>
          <DialogTitle>Create tag</DialogTitle>
          <DialogDescription>Create a new tag to organise your links.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. docs"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <ColorPicker value={createColor} onChange={setCreateColor} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateName(""); setCreateColor("#6366f1") }} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onClose={() => setEditTarget(null)}>
        <DialogHeader>
          <DialogTitle>Edit tag</DialogTitle>
          <DialogDescription>Update the tag name or colour.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Colour</Label>
            <ColorPicker value={editColor} onChange={setEditColor} />
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

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogHeader>
          <DialogTitle>Delete tag</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            Tags will be removed from all URLs.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
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
