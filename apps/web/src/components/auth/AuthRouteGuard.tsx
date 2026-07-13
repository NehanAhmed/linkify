import { type ReactNode } from "react"
import { useAuth } from "@/hooks/use-auth"

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:3000"

export default function AuthRouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (user) {
    window.location.href = APP_URL
    return null
  }

  return <>{children}</>
}
