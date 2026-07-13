import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:3000"

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get("code")
      const errorParam = params.get("error")
      const errorDescription = params.get("error_description")

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
        window.location.href = APP_URL
      }
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
