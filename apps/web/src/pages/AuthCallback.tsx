import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { DASHBOARD_URL } from "@/lib/config"

const AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"])

function sanitizeRedirectPath(redirectTo: string | null): string | null {
  if (!redirectTo) return null
  if (!redirectTo.startsWith("/")) return null
  if (redirectTo.startsWith("//")) return null

  const questionIndex = redirectTo.indexOf("?")
  if (questionIndex !== -1) {
    const searchParams = new URLSearchParams(redirectTo.slice(questionIndex))
    if (searchParams.has("redirectTo")) {
      redirectTo = redirectTo.slice(0, questionIndex)
    }
  }

  if (AUTH_PATHS.has(redirectTo)) return null

  return redirectTo
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const errorParam = params.get("error")
      const errorDescription = params.get("error_description")
      const redirectTo = sanitizeRedirectPath(params.get("redirectTo"))

      if (errorParam) {
        setError(errorDescription ?? "Authentication failed")
        return
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          setError(exchangeError.message)
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        if (redirectTo) {
          const { access_token, refresh_token } = session
          const hash = `#access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&redirectTo=${encodeURIComponent(redirectTo)}`
          window.location.replace(`${DASHBOARD_URL}/auth/callback${hash}`)
        } else {
          navigate("/", { replace: true })
        }
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <a
          href="/login"
          className="text-sm font-medium text-foreground hover:underline"
        >
          Back to sign in
        </a>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      <p className="text-sm text-muted-foreground">
        Completing authentication...
      </p>
    </div>
  )
}
