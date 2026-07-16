import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { listCollections, createCollection, updateCollection, deleteCollection, reorderCollections } from "@/lib/api"
import type { Collection } from "@linkify/shared"
import { toast } from "sonner"
import { Link } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  Folder,
  FolderOpen,
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Loader2,
} from "lucide-react"

interface CollectionNode extends Collection {
  children: CollectionNode[]
}

function buildTree(collections: Collection[]): CollectionNode[] {
  function toNode(c: Collection): CollectionNode {
    return {
      ...c,
      children: collections
        .filter((child) => child.parentId === c.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(toNode),
    }
  }

  return collections
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toNode)
}

function flattenTree(tree: CollectionNode[]): Collection[] {
  const result: Collection[] = []
  for (const node of tree) {
    result.push(node)
    result.push(...node.children)
  }
  return result
}

interface SortableItemProps {
  collection: Collection
  onEdit: (c: Collection) => void
  onDelete: (c: Collection) => void
}

function SortableCollectionItem({ collection, onEdit, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
  })

  const style = {
    transform: transform
      ? `translate3d(${transform.x ?? 0}px, ${transform.y ?? 0}px, 0)`
      : undefined,
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-border px-4 py-3 transition-colors ${
        isDragging ? "opacity-50 shadow-lg" : "bg-card hover:bg-muted/30"
      }`}
    >
      <button
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Folder className="h-4 w-4 shrink-0 text-primary" />
      <Link
        to={`/collections/${collection.id}`}
        className="flex-1 min-w-0 text-sm font-medium text-foreground hover:text-primary truncate"
      >
        {collection.name}
      </Link>
      <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
        {collection.urlCount ?? 0}
      </Badge>
      <button
        onClick={() => onEdit(collection)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDelete(collection)}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface ChildItemProps {
  collection: Collection
  onEdit: (c: Collection) => void
  onDelete: (c: Collection) => void
}

function ChildCollectionItem({ collection, onEdit, onDelete }: ChildItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 ml-8">
      <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Link
        to={`/collections/${collection.id}`}
        className="flex-1 min-w-0 text-sm text-foreground hover:text-primary truncate"
      >
        {collection.name}
      </Link>
      <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
        {collection.urlCount ?? 0}
      </Badge>
      <button
        onClick={() => onEdit(collection)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onDelete(collection)}
        className="text-muted-foreground hover:text-destructive transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function CollectionsListPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""

  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<CollectionNode[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createParentId, setCreateParentId] = useState<number | "">("")
  const [creating, setCreating] = useState(false)

  const [editTarget, setEditTarget] = useState<Collection | null>(null)
  const [editName, setEditName] = useState("")
  const [editing, setEditing] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null)
  const [deleting, setDeleting] = useState(false)

  const prevTreeRef = useRef<CollectionNode[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const data = await listCollections(token, { page: 1, limit: 100 })
      setCollections(data.collections)
      setTree(buildTree(data.collections))
      prevTreeRef.current = buildTree(data.collections)
    } catch {
      toast.error("Failed to load collections")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (!token) return

    const rootIds = tree.map((n) => n.id)
    const oldIndex = rootIds.indexOf(active.id as number)
    const newIndex = rootIds.indexOf(over.id as number)
    if (oldIndex === -1 || newIndex === -1) return

    const newTree = arrayMove(tree, oldIndex, newIndex)
    setTree(newTree)

    const reorderPayload = flattenTree(newTree).map((c, i) => ({
      id: c.id,
      sortOrder: i + 1,
    }))

    try {
      await reorderCollections(token, reorderPayload)
      prevTreeRef.current = newTree
    } catch (err: unknown) {
      setTree(prevTreeRef.current)
      const msg = err instanceof Error ? err.message : "Failed to reorder collections"
      toast.error(msg)
    }
  }

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error("Name is required")
      return
    }
    setCreating(true)
    try {
      await createCollection(token, {
        name: createName.trim(),
        parentId: createParentId !== "" ? createParentId : undefined,
      })
      toast.success("Collection created")
      setCreateOpen(false)
      setCreateName("")
      setCreateParentId("")
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create collection"
      toast.error(msg)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = async () => {
    if (!editTarget) return
    if (!editName.trim()) {
      toast.error("Name is required")
      return
    }
    setEditing(true)
    try {
      await updateCollection(token, editTarget.id, { name: editName.trim() })
      toast.success("Collection updated")
      setEditTarget(null)
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update collection"
      toast.error(msg)
    } finally {
      setEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteCollection(token, deleteTarget.id)
      toast.success("Collection deleted")
      setDeleteTarget(null)
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete collection"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Collections"
        description="Organise links into hierarchical collections."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New collection
          </Button>
        }
      />

      {tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Layers className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-medium text-foreground">No collections yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first collection to start organising links.</p>
          <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create collection
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={tree.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              {tree.map((node) => (
                <div key={node.id} className="space-y-1">
                  <SortableCollectionItem
                    collection={node}
                    onEdit={(c) => { setEditTarget(c); setEditName(c.name) }}
                    onDelete={(c) => setDeleteTarget(c)}
                  />
                  {node.children.length > 0 && (
                    <div className="space-y-1">
                      {node.children.map((child) => (
                        <ChildCollectionItem
                          key={child.id}
                          collection={child}
                          onEdit={(c) => { setEditTarget(c); setEditName(c.name) }}
                          onDelete={(c) => setDeleteTarget(c)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreateName(""); setCreateParentId("") }}>
        <DialogHeader>
          <DialogTitle>Create collection</DialogTitle>
          <DialogDescription>Create a new collection to organise your links.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Name</Label>
            <Input
              id="create-name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Marketing"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-parent">Parent collection (optional)</Label>
            <select
              id="create-parent"
              value={createParentId}
              onChange={(e) => setCreateParentId(e.target.value ? Number(e.target.value) : "")}
              className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="">None (root level)</option>
              {collections
                .filter((c) => c.parentId === null)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateName(""); setCreateParentId("") }} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !createName.trim()}>
            {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
            {creating ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onClose={() => { setEditTarget(null); setEditName("") }}>
        <DialogHeader>
          <DialogTitle>Edit collection</DialogTitle>
          <DialogDescription>Update the collection name.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 px-6 pb-2">
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditTarget(null); setEditName("") }} disabled={editing}>
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
          <DialogTitle>Delete collection</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
            URLs within this collection will not be deleted.
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
