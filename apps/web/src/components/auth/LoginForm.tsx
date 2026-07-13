import { useState, type FormEvent } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/hooks/use-auth"
import SocialButtons from "./SocialButtons"

interface LoginFormProps {
  onSuccess?: () => void
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SocialButtons />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background text-muted-foreground px-2">
            Or continue with
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="flex h-10 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-3 focus:ring-ring/30 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="flex h-10 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-3 focus:ring-ring/30 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-10 w-full items-center justify-center rounded-[10px] bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-80 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-foreground hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
