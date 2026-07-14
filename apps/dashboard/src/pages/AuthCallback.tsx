import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const navigate = useNavigate()
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
      const redirectTo = params.get("redirectTo") || "/overview"

      if (!accessToken || !refreshToken) {
        setError("Invalid authentication data")
        return
      }

      window.location.hash = ""

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (setSessionError) {
        setError(setSessionError.message)
        return
      }

      navigate(redirectTo, { replace: true })
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
        Signing you in...
      </p>
    </div>
  )
}
