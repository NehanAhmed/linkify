import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/supabase"
import { DASHBOARD_URL } from "@/lib/config"

const AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"])

function isSafeRedirectPath(raw: string | null): boolean {
  if (!raw) return false
  if (!raw.startsWith("/")) return false
  if (raw.startsWith("//")) return false

  const questionIndex = raw.indexOf("?")
  if (questionIndex !== -1) {
    const searchParams = new URLSearchParams(raw.slice(questionIndex))
    if (searchParams.has("redirectTo")) {
      raw = raw.slice(0, questionIndex)
    }
  }

  if (AUTH_PATHS.has(raw)) return false

  return true
}

export default function AuthRouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (isLoading || !user) return

    const redirectTo = searchParams.get("redirectTo")
    if (!isSafeRedirectPath(redirectTo)) return

    const target = redirectTo as string
    setIsRedirecting(true)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = "/"
        return
      }
      const { access_token, refresh_token } = session
      const hash = `#access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&redirectTo=${encodeURIComponent(target)}`
      window.location.replace(`${DASHBOARD_URL}/auth/callback${hash}`)
    })
  }, [isLoading, user, searchParams])

  if (isLoading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (user) {
    const redirectTo = searchParams.get("redirectTo")
    if (isSafeRedirectPath(redirectTo)) {
      return null
    }
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
