import { Github, Twitter } from "lucide-react"
import { Link } from "react-router-dom"

const footerLinks = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Documentation"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
  },
]

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                L
              </div>
              <span className="text-lg font-semibold">Linkify</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Enterprise-grade URL shortener and link management platform. Shorten, analyse, and own every link you share.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold">{group.title}</h4>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Linkify. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
