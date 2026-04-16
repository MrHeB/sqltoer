import { Link, useLocation } from "react-router-dom"
import { Home, GitBranch, Droplets, Eraser, Camera, Palette, Binary, Send, FileStack, Database, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "SQL 转 ER 图", href: "/sql-to-er", icon: GitBranch },
  { label: "PDF 加水印", href: "/pdf-watermark", icon: Droplets },
  { label: "PDF 去水印", href: "/pdf-remove-watermark", icon: Eraser },
  { label: "证件照处理", href: "/id-photo", icon: Camera },
  { label: "PDF 合并拆分", href: "/pdf-merge", icon: FileStack },
  { label: "数据库设计", href: "/db-designer", icon: Database },
  { label: "颜色工具", href: "/color-tool", icon: Palette },
  { label: "API 调试", href: "/api-debugger", icon: Send },
  { label: "编解码", href: "/encoding", icon: Binary },
  { label: "二维码", href: "/qrcode-tool", icon: QrCode },
]

export function TopNavbar() {
  const { pathname } = useLocation()

  return (
    <nav className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
      <Link to="/" className="mr-4 shrink-0 text-sm font-bold tracking-tight">
        DB Tools
      </Link>
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
