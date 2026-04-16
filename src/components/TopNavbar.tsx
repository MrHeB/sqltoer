import { Link, useLocation } from "react-router-dom"
import { Home, GitBranch, Droplets, Eraser } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "SQL 转 ER 图", href: "/sql-to-er", icon: GitBranch },
  { label: "PDF 加水印", href: "/pdf-watermark", icon: Droplets },
  { label: "PDF 去水印", href: "/pdf-remove-watermark", icon: Eraser },
]

export function TopNavbar() {
  const { pathname } = useLocation()

  return (
    <nav className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
      <Link to="/" className="mr-6 text-sm font-bold tracking-tight">
        DB Tools
      </Link>
      <div className="flex items-center gap-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
