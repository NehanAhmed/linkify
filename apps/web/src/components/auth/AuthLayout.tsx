import type { ReactNode } from "react"
import { Link } from "react-router-dom"

interface AuthLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
  footer?: ReactNode
}

export default function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center px-6 py-6">
        <Link to="/" className="text-headline text-foreground no-underline">
          Linkify
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-headline mb-2">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </main>
      {footer && (
        <footer className="mx-auto w-full max-w-sm px-6 pb-8 text-center">
          {footer}
        </footer>
      )}
    </div>
  )
}
