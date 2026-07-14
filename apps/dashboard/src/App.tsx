import { Routes, Route } from "react-router-dom"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<h1>Dashboard</h1>} />
    </Routes>
  )
}
