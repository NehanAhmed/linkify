import { useAuth } from "@/hooks/use-auth"
import { Skeleton } from "@/components/ui/skeleton"
import type { ReactNode } from "react"

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, session } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
