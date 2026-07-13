import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

const APP_URL = import.meta.env.VITE_APP_URL ?? "http://localhost:3000"

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const { user, isLoading } = useAuth()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            L
          </div>
          <span className="text-lg font-semibold">Linkify</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          {isLoading ? null : user ? (
            <Button size="sm" render={<a href={APP_URL} />}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" render={<Link to="/login" />}>
                Sign In
              </Button>
              <Button size="sm" render={<Link to="/signup" />}>
                Get Started
              </Button>
            </>
          )}
        </nav>

        <Sheet>
          <SheetTrigger className="md:hidden" render={<Button variant="ghost" size="icon" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="right">
            <nav className="mt-8 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                {isLoading ? null : user ? (
                  <Button render={<a href={APP_URL} />}>
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" render={<Link to="/login" />}>
                      Sign In
                    </Button>
                    <Button render={<Link to="/signup" />}>
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
