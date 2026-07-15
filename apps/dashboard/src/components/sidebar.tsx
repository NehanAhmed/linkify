import { NavLink, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import {
  BarChart3,
  Link2,
  FolderKanban,
  Tags,
  Key,
  CreditCard,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const navItems = [
  { label: "Overview", href: "/overview", icon: BarChart3 },
  { label: "URLs", href: "/urls", icon: Link2 },
  { label: "Collections", href: "/collections", icon: FolderKanban },
  { label: "Tags", href: "/tags", icon: Tags },
  { label: "API Keys", href: "/api-keys", icon: Key },
  { label: "Billing", href: "/billing", icon: CreditCard },
]

export default function Sidebar() {
  const isMobile = useMobile()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const isActive = (href: string) => {
    if (href === "/overview") return location.pathname === "/overview" || location.pathname === "/"
    return location.pathname.startsWith(href)
  }

  const sidebarContent = (
    <nav className="flex h-full flex-col gap-1 px-3 py-4">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          L
        </div>
        <span className="text-sm font-semibold text-foreground">Linkify</span>
      </div>
      {navItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
            isActive(item.href)
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )

  if (isMobile) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="fixed left-4 top-3 z-50"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setOpen(false)}
            />
            <div className="fixed left-0 top-0 z-40 h-full w-64 animate-in slide-in-from-left bg-sidebar text-sidebar-foreground border-r border-border">
              {sidebarContent}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-56 border-r border-border bg-sidebar text-sidebar-foreground md:block">
      {sidebarContent}
    </aside>
  )
}
