import { useState, type FormEvent, useEffect, useRef } from "react"
import { useParams, Link } from "react-router-dom"
import { verifyUrlPassword } from "@/lib/api"
import { Lock, TriangleAlert, Clock, ShieldOff, ArrowLeft } from "lucide-react"

interface ErrorState {
  message: string
  variant: "password" | "static"
}

const COOLDOWN_SECONDS = 12

export default function PasswordInterstitialPage() {
  const { code } = useParams<{ code: string }>()

  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<ErrorState | null>(null)

  const [staticError, setStaticError] = useState<{
    title: string
    description: string
  } | null>(null)

  const [cooldown, setCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!code || !password.trim()) return

    setError(null)
    setSubmitting(true)

    try {
      const { token } = await verifyUrlPassword(code, password)
      window.location.href = `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/${code}?token=${token}`
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong"

      if (msg.includes("INCORRECT_PASSWORD")) {
        setError({ message: "Incorrect password. Please try again.", variant: "password" })
      } else if (msg.includes("LINK_EXPIRED")) {
        setStaticError({ title: "Link expired", description: "This link has expired and is no longer available." })
      } else if (msg.includes("LINK_NOT_ACTIVE")) {
        setStaticError({ title: "Link not active", description: "This link is scheduled but not yet active." })
      } else if (msg.includes("BOTS_BLOCKED")) {
        setStaticError({ title: "Access blocked", description: "Automated access to this link is blocked." })
      } else if (msg.includes("URL_NOT_FOUND")) {
        setStaticError({ title: "Link not found", description: "This short link doesn't exist." })
      } else if (msg.includes("NO_PASSWORD")) {
        window.location.href = `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/${code}`
        return
      } else if (msg.includes("429") || msg.includes("Too many")) {
        setError({ message: "Too many attempts. Please wait.", variant: "password" })
        startCooldown()
      } else {
        setError({ message: msg, variant: "password" })
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!code) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <p className="text-muted-foreground">Invalid link.</p>
      </div>
    )
  }

  if (staticError) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-7xl items-center px-6 py-6">
          <Link to="/" className="text-headline text-foreground no-underline">
            Linkify
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              {staticError.title === "Link expired" || staticError.title === "Link not active" ? (
                <Clock className="h-6 w-6 text-muted-foreground" />
              ) : (
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <h1 className="text-headline mb-2">{staticError.title}</h1>
            <p className="text-muted-foreground text-sm mb-8">{staticError.description}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center px-6 py-6">
        <Link to="/" className="text-headline text-foreground no-underline">
          Linkify
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-headline mb-2">Password required</h1>
            <p className="text-muted-foreground text-sm">
              This link is password protected.
            </p>
            <p className="mt-1 text-xs text-muted-foreground font-mono">
              /{code}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="link-password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="link-password"
                type="password"
                placeholder="Enter the link password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error?.variant === "password") setError(null)
                }}
                required
                autoFocus
                className="flex h-10 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {error && error.variant === "password" && (
              <div className="flex items-start gap-2 rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {error.message}
                  {cooldown > 0 && (
                    <span className="tabular-nums"> ({cooldown}s)</span>
                  )}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password.trim() || cooldown > 0}
              className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-80 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                "Access link"
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
