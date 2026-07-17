import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getSubscription } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import ThemeToggle from "@/components/theme-toggle"
import Breadcrumb from "@/components/ui/breadcrumb"
import { useBreadcrumbs } from "@/hooks/use-breadcrumbs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut } from "lucide-react"

export default function Topbar() {
  const { session, profile, signOut } = useAuth()
  const token = session?.access_token ?? ""
  const breadcrumbs = useBreadcrumbs()
  const [planName, setPlanName] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getSubscription(token)
      .then((data) => setPlanName(data.plan.planName))
      .catch(() => {})
  }, [token])

  const initials = profile?.email
    ? profile.email.charAt(0).toUpperCase()
    : "U"

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-xl px-4 md:px-6">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex items-center gap-3">
        <ThemeToggle />

        {planName && (
          <Badge variant="secondary" className="hidden sm:inline-flex capitalize">
            {planName}
          </Badge>
        )}

        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Avatar className="h-7 w-7 cursor-pointer">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="mt-1.5">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
