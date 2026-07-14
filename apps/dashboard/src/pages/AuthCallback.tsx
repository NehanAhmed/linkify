import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:5173"
const WEB_LOGIN_URL = APP_URL && !APP_URL.startsWith(window.location.origin)
  ? APP_URL
  : "http://localhost:5173"
const DEFAULT_REDIRECT = "/overview"

const AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/auth/callback"])

function sanitizeRedirectPath(hashRedirect: string | null): string {
  if (!hashRedirect) return DEFAULT_REDIRECT
  if (!hashRedirect.startsWith("/")) return DEFAULT_REDIRECT
  if (hashRedirect.startsWith("//")) return DEFAULT_REDIRECT

  const questionIndex = hashRedirect.indexOf("?")
  if (questionIndex !== -1) {
    const searchParams = new URLSearchParams(hashRedirect.slice(questionIndex))
    if (searchParams.has("redirectTo")) {
      hashRedirect = hashRedirect.slice(0, questionIndex)
    }
  }

  if (AUTH_PATHS.has(hashRedirect)) return DEFAULT_REDIRECT

  return hashRedirect
}

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      const hash = window.location.hash.slice(1)
      if (!hash) {
        setError("No authentication data received")
        return
      }

      const params = new URLSearchParams(hash)
      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const redirectTo = sanitizeRedirectPath(params.get("redirectTo"))

      if (!accessToken || !refreshToken) {
        setError("Invalid authentication data")
        return
      }

      history.replaceState(null, "", window.location.pathname)

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (setSessionError) {
        setError(setSessionError.message)
        return
      }

      window.location.replace(redirectTo)
    }

    handleCallback()
  }, [])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <a
          href={`${WEB_LOGIN_URL}/login`}
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
        Signing you in...
      </p>
    </div>
  )
}
