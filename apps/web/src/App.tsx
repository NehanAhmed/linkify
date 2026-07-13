import { Routes, Route } from "react-router-dom"
import { AuthProvider } from "@/hooks/use-auth"
import AuthRouteGuard from "@/components/auth/AuthRouteGuard"
import LandingPage from "@/pages/LandingPage"
import LoginPage from "@/pages/LoginPage"
import SignUpPage from "@/pages/SignUpPage"
import ForgotPasswordPage from "@/pages/ForgotPasswordPage"
import ResetPasswordPage from "@/pages/ResetPasswordPage"
import AuthCallback from "@/pages/AuthCallback"
import NotFound from "@/pages/NotFound"

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <AuthRouteGuard>
              <LoginPage />
            </AuthRouteGuard>
          }
        />
        <Route
          path="/signup"
          element={
            <AuthRouteGuard>
              <SignUpPage />
            </AuthRouteGuard>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthRouteGuard>
              <ForgotPasswordPage />
            </AuthRouteGuard>
          }
        />
        <Route
          path="/reset-password"
          element={
            <AuthRouteGuard>
              <ResetPasswordPage />
            </AuthRouteGuard>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
