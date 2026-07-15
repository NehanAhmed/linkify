import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export default function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const candidates = [1, totalPages, page - 1, page, page + 1]
  const unique = [...new Set(candidates)].filter((p) => p >= 1 && p <= totalPages)
  unique.sort((a, b) => a - b)

  const pages: (number | "...")[] = [unique[0]]
  for (let i = 1; i < unique.length; i++) {
    if (unique[i] - unique[i - 1] > 1) {
      pages.push("...")
    }
    pages.push(unique[i])
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">
            ...
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "primary" : "outline"}
            size="sm"
            className="min-w-[32px]"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

interface PageSizeSelectorProps {
  pageSize: number
  onPageSizeChange: (size: number) => void
  className?: string
}

export function PageSizeSelector({ pageSize, onPageSizeChange, className }: PageSizeSelectorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span>Show</span>
      <select
        aria-label="Page size"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
      <span>per page</span>
    </div>
  )
}
