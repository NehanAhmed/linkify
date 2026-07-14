import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { fetchMe } from "@/lib/api"
import { DASHBOARD_URL } from "@/lib/config"

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  profile: { id: string; email: string; role: string; createdAt: string } | null
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{
    error: string | null
    needsEmailVerification: boolean
  }>
  signOut: () => Promise<void>
  signInWithProvider: (provider: "google" | "github") => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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

function getRedirectTo(): string | null {
  return sanitizeRedirectPath(
    new URLSearchParams(window.location.search).get("redirectTo"),
  )
}

function relaySessionToDashboard(session: Session) {
  const { access_token, refresh_token } = session
  const redirectTo = getRedirectTo() || "/overview"
  const hash = `#access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&redirectTo=${encodeURIComponent(redirectTo)}`
  window.location.replace(`${DASHBOARD_URL}/auth/callback${hash}`)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    profile: null,
  })

  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const profile = await fetchMe(accessToken)
      setState((prev) => ({ ...prev, profile }))
    } catch {
      setState((prev) => ({ ...prev, profile: null }))
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false,
      }))
      if (session?.access_token) {
        fetchProfile(session.access_token)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false,
      }))
      if (session?.access_token) {
        fetchProfile(session.access_token)
      } else {
        setState((prev) => ({ ...prev, profile: null }))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }

      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        return { error: "Please verify your email before signing in. Check your inbox." }
      }

      if (data.session && getRedirectTo()) {
        relaySessionToDashboard(data.session)
      } else {
        navigate("/")
      }
      return { error: null }
    },
    [navigate]
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const redirectTo = getRedirectTo()
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo
            ? `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
            : `${window.location.origin}/auth/callback`,
        },
      })
      if (error) return { error: error.message, needsEmailVerification: false }

      const needsEmailVerification =
        data.user?.identities?.length === 0 ||
        data.session === null

      if (!needsEmailVerification && data.session) {
        if (redirectTo) {
          relaySessionToDashboard(data.session)
        } else {
          navigate("/")
        }
      }

      return { error: null, needsEmailVerification }
    },
    [navigate]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setState({
      user: null,
      session: null,
      isLoading: false,
      profile: null,
    })
  }, [])

  const signInWithProvider = useCallback(
    async (provider: "google" | "github") => {
      try {
        const redirectTo = getRedirectTo()
        const callbackUrl = redirectTo
          ? `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
          : `${window.location.origin}/auth/callback`

        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: callbackUrl },
        })
        if (error) return { error: error.message }
      } catch {
        return { error: "An unexpected error occurred. Please try again." }
      }
      return { error: null }
    },
    []
  )

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { error: error.message }
    return { error: null }
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    navigate("/")
    return { error: null }
  }, [navigate])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        signInWithProvider,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
