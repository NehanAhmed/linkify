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

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  profile: { id: string; email: string; role: string; createdAt: string } | null
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
}

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:5173"

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

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

  const redirectToLogin = useCallback(() => {
    const currentPath = window.location.pathname + window.location.search
    window.location.href = `${APP_URL}/login?redirectTo=${encodeURIComponent(currentPath)}`
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

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setState({
      user: null,
      session: null,
      isLoading: false,
      profile: null,
    })
    redirectToLogin()
  }, [redirectToLogin])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut,
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
