import { useLocation } from "react-router-dom"

interface BreadcrumbItem {
  label: string
  href?: string
}

const segmentLabels: Record<string, string> = {
  overview: "Overview",
  urls: "URLs",
  new: "Create URL",
  bulk: "Bulk Create",
  settings: "Settings",
  collections: "Collections",
  tags: "Tags",
  "api-keys": "API Keys",
  billing: "Billing",
  plans: "Plans",
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation()
  const segments = location.pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return [{ label: "Overview", href: "/overview" }]
  }

  const items: BreadcrumbItem[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const path = "/" + segments.slice(0, i + 1).join("/")

    const label = segmentLabels[segment] ?? segment

    const isLast = i === segments.length - 1

    items.push({
      label,
      ...(isLast ? {} : { href: path }),
    })
  }

  return items
}
