import PageHeader from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

export default function UrlsListPage() {
  return (
    <div>
      <PageHeader
        title="URLs"
        description="Manage your short links"
        actions={
          <div className="flex gap-2">
            <Link to="/urls/new">
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Create URL
              </Button>
            </Link>
            <Link to="/urls/bulk">
              <Button variant="outline" size="sm">
                Bulk Create
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}
