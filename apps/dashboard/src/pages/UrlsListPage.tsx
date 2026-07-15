import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { listUrls, listTags, listCollections, softDeleteUrl } from "@/lib/api"
import type { ShortUrl, Tag, Collection, Pagination as PaginatedInfo } from "@linkify/shared"
import { toast } from "sonner"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip } from "@/components/ui/tooltip"
import StatusBadge, { getLinkStatus } from "@/components/status-badge"
import TablePagination, { PageSizeSelector } from "@/components/ui/pagination"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Link as LinkIcon,
  ExternalLink,
  Trash2,
  Settings,
  MoreHorizontal,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface FiltersState {
  q: string
  tagIds: string
  collectionId: string
  createdAfter: string
  createdBefore: string
  hasPassword: string
  isActive: string
  sortBy: string
  sortOrder: string
  page: string
  limit: string
}

const defaultFilters: FiltersState = {
  q: "",
  tagIds: "",
  collectionId: "",
  createdAfter: "",
  createdBefore: "",
  hasPassword: "",
  isActive: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  page: "1",
  limit: "10",
}

export default function UrlsListPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ""
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const getFilters = useCallback((): FiltersState => {
    const f = { ...defaultFilters }
    for (const key of Object.keys(defaultFilters) as (keyof FiltersState)[]) {
      const val = searchParams.get(key)
      if (val) f[key] = val
    }
    return f
  }, [searchParams])

  const [filters, setFilters] = useState<FiltersState>(getFilters)
  const [urls, setUrls] = useState<ShortUrl[]>([])
  const [pagination, setPagination] = useState<PaginatedInfo | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const totalActiveFilters = [filters.tagIds, filters.collectionId, filters.createdAfter, filters.createdBefore, filters.hasPassword, filters.isActive].filter(Boolean).length

  async function fetchAllPages<T>(
    fetcher: (page: number) => Promise<{ items: T[]; pagination: PaginatedInfo }>,
  ): Promise<T[]> {
    const first = await fetcher(1)
    const all = [...first.items]
    const totalPages = first.pagination.totalPages ?? 1
    for (let p = 2; p <= totalPages; p++) {
      const page = await fetcher(p)
      all.push(...page.items)
    }
    return all
  }

  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (!token) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    try {
      const params = new URLSearchParams()
      for (const [key, val] of Object.entries(filters)) {
        if (val) params.set(key, val)
      }
      const [urlsData, tagsData, collectionsData] = await Promise.all([
        listUrls(token, Object.fromEntries(params)),
        fetchAllPages((page) => listTags(token, { page }).then((d) => ({ items: d.tags, pagination: d.pagination }))).catch(() => [] as Tag[]),
        fetchAllPages((page) => listCollections(token, { page }).then((d) => ({ items: d.collections, pagination: d.pagination }))).catch(() => [] as Collection[]),
      ])
      if (!controller.signal.aborted) {
        setUrls(urlsData.urls)
        setPagination(urlsData.pagination)
        setTags(tagsData)
        setCollections(collectionsData)
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return
      const msg = err instanceof Error ? err.message : "Failed to load URLs"
      if (!controller.signal.aborted) toast.error(msg)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [token, filters])

  useEffect(() => {
    fetchData()
    return () => abortRef.current?.abort()
  }, [fetchData])

  useEffect(() => {
    const newParams = new URLSearchParams()
    for (const [key, val] of Object.entries(filters)) {
      if (val) newParams.set(key, val)
    }
    setSearchParams(newParams, { replace: true })
  }, [filters, setSearchParams])

  const updateFilter = (key: keyof FiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: key === "page" ? value : "1" }))
    setSelected(new Set())
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setSelected(new Set())
  }

  const handleSort = (column: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === "asc" ? "desc" : "asc",
      page: "1",
    }))
  }

  const toggleSelect = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === urls.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(urls.map((u) => u.code)))
    }
  }

  const handleDelete = async (code: string) => {
    setDeleting(true)
    try {
      await softDeleteUrl(token, code)
      toast.success("URL deleted")
      setDeleteDialog(null)
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete"
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return <ChevronsUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    return filters.sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="URLs"
        description="Manage your short links"
        actions={
          <div className="flex gap-2">
            <Link to="/urls/new">
              <Button size="sm">Create URL</Button>
            </Link>
            <Link to="/urls/bulk">
              <Button variant="outline" size="sm">Bulk Create</Button>
            </Link>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search URLs and codes..."
            value={filters.q}
            onChange={(e) => updateFilter("q", e.target.value)}
            className="pl-9 pr-8"
          />
          {filters.q && (
            <button
              onClick={() => updateFilter("q", "")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Popover>
          <PopoverTrigger>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {totalActiveFilters > 0 && (
                <Badge variant="default" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">{totalActiveFilters}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 space-y-4" align="end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tag</label>
              <select
                value={filters.tagIds}
                onChange={(e) => updateFilter("tagIds", e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">All tags</option>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Collection</label>
              <select
                value={filters.collectionId}
                onChange={(e) => updateFilter("collectionId", e.target.value)}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-sm"
              >
                <option value="">All collections</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={filters.createdAfter}
                  onChange={(e) => updateFilter("createdAfter", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input
                  type="date"
                  value={filters.createdBefore}
                  onChange={(e) => updateFilter("createdBefore", e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Password protected</span>
                <Switch
                  checked={filters.hasPassword === "true"}
                  onCheckedChange={(checked) => updateFilter("hasPassword", checked ? "true" : "")}
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Active only</span>
                <Switch
                  checked={filters.isActive === "true"}
                  onCheckedChange={(checked) => updateFilter("isActive", checked ? "true" : "")}
                />
              </label>
            </div>

            {(filters.q || totalActiveFilters > 0) && (
              <Button variant="ghost" size="sm" className="w-full" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : urls.length === 0 && !filters.q && totalActiveFilters === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LinkIcon className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-medium text-foreground">No links yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">Create your first short link to get started.</p>
          <Link to="/urls/new">
            <Button size="sm" className="mt-4">Create your first link</Button>
          </Link>
        </div>
      ) : urls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <h3 className="mt-4 text-base font-medium text-foreground">No matching links</h3>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all URLs"
                    checked={selected.size === urls.length && urls.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border"
                  />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("code")}>
                  <div className="flex items-center">
                    Code
                    <SortIcon column="code" />
                  </div>
                </TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("visits")}>
                  <div className="flex items-center">
                    Visits
                    <SortIcon column="visits" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort("createdAt")}>
                  <div className="flex items-center">
                    Created
                    <SortIcon column="createdAt" />
                  </div>
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {urls.map((url) => {
                const status = getLinkStatus(url)
                return (
                  <TableRow key={url.code}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${url.code}`}
                        checked={selected.has(url.code)}
                        onChange={() => toggleSelect(url.code)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/urls/${url.code}`}
                        className="font-mono text-sm font-medium text-primary hover:underline"
                      >
                        {url.code}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <Tooltip content={url.url}>
                        <a
                          href={url.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground truncate"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{url.url}</span>
                        </a>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground truncate block max-w-[180px]">
                        {url.title ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm tabular-nums">
                        <span className="font-medium">{url.visits}</span>
                        <span className="text-muted-foreground ml-1">/ {url.uniqueVisits}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {format(new Date(url.createdAt), "MMM d, yyyy")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(url.shortUrl)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Copy short URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(url.url)}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Copy destination URL
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/urls/${url.code}/settings`)}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteDialog(url.code)}>
                            <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                            <span className="text-destructive">Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {pagination && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <PageSizeSelector
                pageSize={Number(filters.limit)}
                onPageSizeChange={(size) => updateFilter("limit", String(size))}
              />
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <TablePagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => updateFilter("page", String(page))}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)}>
        <DialogHeader>
          <DialogTitle>Delete URL</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <span className="font-mono font-medium text-foreground">{deleteDialog}</span>?
            This link will no longer be accessible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteDialog && handleDelete(deleteDialog)}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
