import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import {
  listUrls, listTags, listCollections, softDeleteUrl,
  bulkOperations, importCsv, bulkTagUrls, getSubscription,
} from "@/lib/api"
import type { ShortUrl, Tag, Collection, Pagination as PaginatedInfo, BulkResult } from "@linkify/shared"
import { toast } from "sonner"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Tag as TagIcon,
  Tags,
  Folder,
  CalendarDays,
  FileSpreadsheet,
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  Table as TableIcon,
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
  const [hasBulkOps, setHasBulkOps] = useState(false)

  // Bulk tag dialog
  const [bulkTagOpen, setBulkTagOpen] = useState(false)
  const [bulkTagIds, setBulkTagIds] = useState<number[]>([])
  const [bulkTagging, setBulkTagging] = useState(false)

  // Bulk move dialog
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkMoveCollectionId, setBulkMoveCollectionId] = useState<number | "">("")
  const [bulkMoving, setBulkMoving] = useState(false)

  // Bulk extend dialog
  const [bulkExtendOpen, setBulkExtendOpen] = useState(false)
  const [bulkExtendDays, setBulkExtendDays] = useState(30)
  const [bulkExtending, setBulkExtending] = useState(false)

  // Bulk delete dialog
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // CSV import
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvText, setCsvText] = useState("")
  const [csvCollectionId, setCsvCollectionId] = useState<number | "">("")
  const [csvResults, setCsvResults] = useState<BulkResult[] | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)

  const csvPreview = (() => {
    if (!csvText.trim() || csvResults) return null
    const lines = csvText.trim().split("\n")
    if (lines.length < 2) return null
    const headers = lines[0].split(",").map((h) => h.trim())
    const dataRows = lines.slice(1).filter(Boolean)
    return { headers, totalRows: dataRows.length }
  })()

  const totalActiveFilters = [filters.tagIds, filters.collectionId, filters.createdAfter, filters.createdBefore, filters.hasPassword, filters.isActive].filter(Boolean).length

  const abortRef = useRef<AbortController | null>(null)

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
      const [urlsData, tagsData, collectionsData, subData] = await Promise.all([
        listUrls(token, Object.fromEntries(params)),
        fetchAllPages((page) => listTags(token, { page }).then((d) => ({ items: d.tags, pagination: d.pagination }))).catch(() => [] as Tag[]),
        fetchAllPages((page) => listCollections(token, { page }).then((d) => ({ items: d.collections, pagination: d.pagination }))).catch(() => [] as Collection[]),
        getSubscription(token).catch(() => null),
      ])
      if (!controller.signal.aborted) {
        setUrls(urlsData.urls)
        setPagination(urlsData.pagination)
        setTags(tagsData)
        setCollections(collectionsData)
        setHasBulkOps(subData?.plan?.features?.bulkOperations ?? false)
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

  // Bulk operations
  const handleBulkTag = async () => {
    if (bulkTagIds.length === 0) { toast.error("Select at least one tag"); return }
    setBulkTagging(true)
    try {
      const results = await bulkTagUrls(token, Array.from(selected), bulkTagIds)
      const ok = results.filter((r) => r.success).length
      toast.success(`${ok} of ${results.length} tagged successfully`)
      setBulkTagOpen(false)
      setBulkTagIds([])
      setSelected(new Set())
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to tag URLs"
      toast.error(msg)
    } finally {
      setBulkTagging(false)
    }
  }

  const handleBulkMove = async () => {
    if (bulkMoveCollectionId === "") { toast.error("Select a collection"); return }
    setBulkMoving(true)
    try {
      const results = await bulkOperations(token, {
        operation: "move",
        codes: Array.from(selected),
        collectionId: Number(bulkMoveCollectionId),
      })
      const ok = results.filter((r) => r.success).length
      toast.success(`${ok} of ${results.length} moved successfully`)
      setBulkMoveOpen(false)
      setBulkMoveCollectionId("")
      setSelected(new Set())
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move URLs"
      toast.error(msg)
    } finally {
      setBulkMoving(false)
    }
  }

  const handleBulkExtend = async () => {
    if (bulkExtendDays < 1 || bulkExtendDays > 365) { toast.error("Days must be between 1 and 365"); return }
    setBulkExtending(true)
    try {
      const results = await bulkOperations(token, {
        operation: "extend",
        codes: Array.from(selected),
        extendDays: bulkExtendDays,
      })
      const ok = results.filter((r) => r.success).length
      toast.success(`${ok} of ${results.length} extended successfully`)
      setBulkExtendOpen(false)
      setSelected(new Set())
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to extend URLs"
      toast.error(msg)
    } finally {
      setBulkExtending(false)
    }
  }

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    try {
      const results = await bulkOperations(token, {
        operation: "delete",
        codes: Array.from(selected),
      })
      const ok = results.filter((r) => r.success).length
      toast.success(`${ok} of ${results.length} deleted successfully`)
      setBulkDeleteOpen(false)
      setSelected(new Set())
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete URLs"
      toast.error(msg)
    } finally {
      setBulkDeleting(false)
    }
  }

  // CSV import
  const handleCsvImport = async () => {
    if (!csvText.trim()) { toast.error("Paste CSV content first"); return }
    setCsvImporting(true)
    setCsvResults(null)
    try {
      const results = await importCsv(
        token,
        csvText.trim(),
        csvCollectionId !== "" ? Number(csvCollectionId) : undefined,
      )
      setCsvResults(results)
      const ok = results.filter((r) => r.success).length
      toast.success(`${ok} of ${results.length} URLs created successfully`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to import CSV"
      toast.error(msg)
    } finally {
      setCsvImporting(false)
    }
  }

  const selectedArray = Array.from(selected)

  const SortIcon = ({ column }: { column: string }) => {
    if (filters.sortBy !== column) return <ChevronsUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
    return filters.sortOrder === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3" />
    )
  }

  return (
    <div className="space-y-4 pb-16">
      <PageHeader
        title="URLs"
        description="Manage your short links"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Import CSV
            </Button>
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

      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card px-4 py-3 shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {selected.size} selected
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
            {hasBulkOps ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setBulkTagOpen(true)}>
                  <Tags className="mr-1.5 h-4 w-4" />Tag
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBulkMoveOpen(true)}>
                  <Folder className="mr-1.5 h-4 w-4" />Move
                </Button>
                <Button size="sm" variant="outline" onClick={() => setBulkExtendOpen(true)}>
                  <CalendarDays className="mr-1.5 h-4 w-4" />Extend
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />Delete
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="default" className="text-[10px]">Pro</Badge>
                <span className="text-sm text-muted-foreground">
                  Bulk operations require Pro plan
                </span>
                <Link to="/billing/plans">
                  <Button size="sm" variant="primary">Upgrade</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Delete Dialog */}
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
          <Button variant="destructive" onClick={() => deleteDialog && handleDelete(deleteDialog)} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Tag Dialog */}
      <Dialog open={bulkTagOpen} onClose={() => { setBulkTagOpen(false); setBulkTagIds([]) }}>
        <DialogHeader>
          <DialogTitle>Tag {selected.size} URLs</DialogTitle>
          <DialogDescription>Select tags to apply to all selected URLs.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-6 pb-2 max-h-60 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags yet. Create one first.</p>
          ) : (
            tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={bulkTagIds.includes(tag.id)}
                  onChange={() => {
                    setBulkTagIds((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id]
                    )
                  }}
                  className="h-4 w-4 rounded border-border"
                />
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                <span className="text-sm text-foreground">{tag.name}</span>
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setBulkTagOpen(false); setBulkTagIds([]) }} disabled={bulkTagging}>
            Cancel
          </Button>
          <Button onClick={handleBulkTag} disabled={bulkTagging || bulkTagIds.length === 0}>
            {bulkTagging ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <TagIcon className="mr-1.5 h-4 w-4" />}
            {bulkTagging ? "Tagging..." : `Tag ${selected.size} URLs`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Move Dialog */}
      <Dialog open={bulkMoveOpen} onClose={() => { setBulkMoveOpen(false); setBulkMoveCollectionId("") }}>
        <DialogHeader>
          <DialogTitle>Move {selected.size} URLs</DialogTitle>
          <DialogDescription>Select a collection to move URLs into.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 px-6 pb-2">
          <Label htmlFor="bulk-move-collection">Collection</Label>
          <select
            id="bulk-move-collection"
            value={bulkMoveCollectionId}
            onChange={(e) => setBulkMoveCollectionId(e.target.value ? Number(e.target.value) : "")}
            className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Select a collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setBulkMoveOpen(false); setBulkMoveCollectionId("") }} disabled={bulkMoving}>
            Cancel
          </Button>
          <Button onClick={handleBulkMove} disabled={bulkMoving || bulkMoveCollectionId === ""}>
            {bulkMoving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Folder className="mr-1.5 h-4 w-4" />}
            {bulkMoving ? "Moving..." : `Move ${selected.size} URLs`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Extend Dialog */}
      <Dialog open={bulkExtendOpen} onClose={() => { setBulkExtendOpen(false); setBulkExtendDays(30) }}>
        <DialogHeader>
          <DialogTitle>Extend {selected.size} URLs</DialogTitle>
          <DialogDescription>Extend the expiry date by a number of days.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 px-6 pb-2">
          <Label htmlFor="bulk-extend-days">Days to extend (1–365)</Label>
          <div className="flex gap-2">
            {[7, 30, 60, 90, 365].map((d) => (
              <Button
                key={d}
                variant={bulkExtendDays === d ? "primary" : "outline"}
                size="sm"
                onClick={() => setBulkExtendDays(d)}
              >
                {d}d
              </Button>
            ))}
          </div>
          <Input
            id="bulk-extend-days"
            type="number"
            min={1}
            max={365}
            value={bulkExtendDays}
            onChange={(e) => setBulkExtendDays(Math.min(365, Math.max(1, Number(e.target.value))))}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setBulkExtendOpen(false); setBulkExtendDays(30) }} disabled={bulkExtending}>
            Cancel
          </Button>
          <Button onClick={handleBulkExtend} disabled={bulkExtending || bulkExtendDays < 1 || bulkExtendDays > 365}>
            {bulkExtending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-1.5 h-4 w-4" />}
            {bulkExtending ? "Extending..." : `Extend ${selected.size} URLs`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete {selected.size} URLs</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete these {selected.size} URLs? They will no longer be accessible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            {bulkDeleting ? "Deleting..." : `Delete ${selected.size} URLs`}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog
        open={csvOpen}
        onClose={() => { setCsvOpen(false); setCsvText(""); setCsvResults(null); setCsvCollectionId("") }}
      >
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
          <DialogDescription>
            Paste CSV content to create multiple URLs at once.
            <br />
            Columns: <span className="font-mono text-xs">url</span> (required),{" "}
            <span className="font-mono text-xs">customCode</span>,{" "}
            <span className="font-mono text-xs">ttlDays</span>,{" "}
            <span className="font-mono text-xs">password</span>,{" "}
            <span className="font-mono text-xs">activeAt</span>,{" "}
            <span className="font-mono text-xs">tags</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-2">
          {!csvResults ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="csv-text">CSV Content</Label>
                <Textarea
                  id="csv-text"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`url,customCode,ttlDays\nhttps://example.com,my-link,30`}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
              {csvPreview && (
                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <TableIcon className="h-3.5 w-3.5" />
                    <span>Preview — {csvPreview.totalRows} data {csvPreview.totalRows === 1 ? "row" : "rows"}, {csvPreview.headers.length} columns</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {csvPreview.headers.map((header, i) => (
                      <span key={i} className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {header}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="csv-collection">Collection (optional)</Label>
                <select
                  id="csv-collection"
                  value={csvCollectionId}
                  onChange={(e) => setCsvCollectionId(e.target.value ? Number(e.target.value) : "")}
                  className="flex h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">None</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-foreground">
                  {csvResults.filter((r) => r.success).length} of {csvResults.length} URLs created
                </span>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {csvResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                    {r.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="font-mono">{r.code ?? `row ${(r.index ?? 0) + 1}`}</span>
                    {!r.success && r.error && (
                      <span className="text-muted-foreground">— {r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {!csvResults ? (
            <>
              <Button variant="outline" onClick={() => { setCsvOpen(false); setCsvText(""); setCsvCollectionId("") }} disabled={csvImporting}>
                Cancel
              </Button>
              <Button onClick={handleCsvImport} disabled={csvImporting || !csvText.trim()}>
                {csvImporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                {csvImporting ? "Importing..." : "Import"}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={() => { setCsvOpen(false); setCsvText(""); setCsvResults(null); setCsvCollectionId("") }}
            >
              Done
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  )
}
