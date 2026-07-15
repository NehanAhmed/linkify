import { Routes, Route, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import ErrorBoundary from "@/components/error-boundary"
import ProtectedRoute from "@/components/protected-route"
import AppLayout from "@/components/app-layout"
import AuthCallback from "@/pages/AuthCallback"
import OverviewPage from "@/pages/Overview"
import UrlsListPage from "@/pages/UrlsListPage"
import CreateUrlPage from "@/pages/CreateUrlPage"
import BulkCreatePage from "@/pages/BulkCreatePage"
import UrlDetailPage from "@/pages/UrlDetailPage"
import UrlSettingsPage from "@/pages/UrlSettingsPage"
import CollectionsListPage from "@/pages/CollectionsListPage"
import CollectionDetailPage from "@/pages/CollectionDetailPage"
import TagsListPage from "@/pages/TagsListPage"
import TagDetailPage from "@/pages/TagDetailPage"
import ApiKeysPage from "@/pages/ApiKeysPage"
import BillingPage from "@/pages/BillingPage"
import PlansPage from "@/pages/PlansPage"
import NotFoundPage from "@/pages/NotFound"

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
            <Route path="/urls/bulk" element={<BulkCreatePage />} />
            <Route path="/urls/:code" element={<UrlDetailPage />} />
            <Route path="/urls/:code/settings" element={<UrlSettingsPage />} />
            <Route path="/collections" element={<CollectionsListPage />} />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
            <Route path="/tags" element={<TagsListPage />} />
            <Route path="/tags/:id" element={<TagDetailPage />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/plans" element={<PlansPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
