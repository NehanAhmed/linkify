import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { fetchMe } from "@/lib/api"

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
  signInWithProvider: (provider: "google" | "github") => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:3000"

export function AuthProvider({ children }: { children: ReactNode }) {
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { error: error.message }
      window.location.href = APP_URL
      return { error: null }
    },
    []
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) return { error: error.message, needsEmailVerification: false }

      const needsEmailVerification =
        data.user?.identities?.length === 0 ||
        data.session === null

      if (!needsEmailVerification && data.session) {
        window.location.href = APP_URL
      }

      return { error: null, needsEmailVerification }
    },
    []
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
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
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
    window.location.href = APP_URL
    return { error: null }
  }, [])

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
