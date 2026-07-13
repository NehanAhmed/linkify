import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import AuthLayout from "@/components/auth/AuthLayout"
import ResetPasswordForm from "@/components/auth/ResetPasswordForm"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [isValid, setIsValid] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setIsValid(true)
        setIsChecking(false)
      } else {
        setIsChecking(false)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValid(true)
      }
      setIsChecking(false)
    })
  }, [navigate])

  if (isChecking) {
    return (
      <AuthLayout title="Reset your password" subtitle="Verifying your link...">
        <div className="flex justify-center py-8">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
        </div>
      </AuthLayout>
    )
  }

  if (!isValid) {
    return (
      <AuthLayout
        title="Invalid or expired link"
        subtitle="This password reset link is invalid or has expired. Please request a new one."
      >
        <div className="text-center">
          <a
            href="/forgot-password"
            className="text-sm font-medium text-foreground hover:underline"
          >
            Request a new reset link
          </a>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Set new password"
      subtitle="Enter your new password below"
    >
      <ResetPasswordForm />
    </AuthLayout>
  )
}
