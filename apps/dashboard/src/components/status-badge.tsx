import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "success" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "success" },
  expired: { label: "Expired", variant: "destructive" },
  scheduled: { label: "Scheduled", variant: "outline" },
  "password-protected": { label: "Password", variant: "default" },
  "blocked-bots": { label: "Bots Blocked", variant: "secondary" },
  inactive: { label: "Inactive", variant: "secondary" },
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "outline" as const }

  return (
    <Badge variant={config.variant} className={cn("capitalize", className)}>
      {config.label}
    </Badge>
  )
}

export function getLinkStatus(link: { expiresAt: string | null; activeAt: string | null; hasPassword: boolean; blockBots: boolean }): string {
  const now = new Date()

  if (link.activeAt && new Date(link.activeAt) > now) {
    return "scheduled"
  }
  if (link.expiresAt && new Date(link.expiresAt) < now) {
    return "expired"
  }
  if (link.hasPassword) {
    return "password-protected"
  }
  if (link.blockBots) {
    return "blocked-bots"
  }
  return "active"
}
