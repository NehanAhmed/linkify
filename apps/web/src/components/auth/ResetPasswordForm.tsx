import { useState, type FormEvent } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function ResetPasswordForm() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)

    const { error: updateError } = await updatePassword(password)
    if (updateError) {
      setError(updateError)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="new-password"
          className="flex h-10 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-3 focus:ring-ring/30 focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm-new-password" className="text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirm-new-password"
          type="password"
          placeholder="Repeat your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
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
            Updating...
          </span>
        ) : (
          "Reset password"
        )}
      </button>
    </form>
  )
}
