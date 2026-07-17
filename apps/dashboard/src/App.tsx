import { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import ErrorBoundary from "@/components/error-boundary"
import ProtectedRoute from "@/components/protected-route"
import AppLayout from "@/components/app-layout"
import AuthCallback from "@/pages/AuthCallback"
import OverviewPage from "@/pages/Overview"
import UrlsListPage from "@/pages/UrlsListPage"
import CreateUrlPage from "@/pages/CreateUrlPage"
import CollectionsListPage from "@/pages/CollectionsListPage"
import CollectionDetailPage from "@/pages/CollectionDetailPage"
import TagsListPage from "@/pages/TagsListPage"
import TagDetailPage from "@/pages/TagDetailPage"
import NotFoundPage from "@/pages/NotFound"

const BulkCreatePage = lazy(() => import("@/pages/BulkCreatePage"))
const UrlDetailPage = lazy(() => import("@/pages/UrlDetailPage"))
const UrlSettingsPage = lazy(() => import("@/pages/UrlSettingsPage"))
const ApiKeysPage = lazy(() => import("@/pages/ApiKeysPage"))
const BillingPage = lazy(() => import("@/pages/BillingPage"))
const PlansPage = lazy(() => import("@/pages/PlansPage"))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/urls" element={<UrlsListPage />} />
            <Route path="/urls/new" element={<CreateUrlPage />} />
            <Route path="/urls/bulk" element={<SuspenseWrapper><BulkCreatePage /></SuspenseWrapper>} />
            <Route path="/urls/:code" element={<SuspenseWrapper><UrlDetailPage /></SuspenseWrapper>} />
            <Route path="/urls/:code/settings" element={<SuspenseWrapper><UrlSettingsPage /></SuspenseWrapper>} />
            <Route path="/collections" element={<CollectionsListPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
            <Route path="/tags" element={<TagsListPage />} />
            <Route path="/tags/:id" element={<TagDetailPage />} />
            <Route path="/api-keys" element={<SuspenseWrapper><ApiKeysPage /></SuspenseWrapper>} />
            <Route path="/billing" element={<SuspenseWrapper><BillingPage /></SuspenseWrapper>} />
            <Route path="/billing/plans" element={<SuspenseWrapper><PlansPage /></SuspenseWrapper>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </ThemeProvider>
  )
}