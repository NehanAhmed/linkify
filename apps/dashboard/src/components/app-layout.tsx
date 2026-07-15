import { Outlet } from "react-router-dom"
import Sidebar from "@/components/sidebar"
import Topbar from "@/components/topbar"
import { Toaster } from "sonner"

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col md:pl-56">
        <Topbar />
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
