import { Routes, Route } from "react-router-dom"
import AuthCallback from "@/pages/AuthCallback"

export default function App() {
  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="*" element={<h1>Dashboard</h1>} />
    </Routes>
  )
}
