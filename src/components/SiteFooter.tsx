import { ShieldCheck } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="flex h-9 shrink-0 items-center justify-center gap-2 border-t border-border/40 bg-background px-4 text-xs text-muted-foreground">
      <span>© {new Date().getFullYear()} SQLToER</span>
      <span className="text-border">·</span>
      <a
        href="https://beian.miit.gov.cn"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-foreground"
      >
        皖ICP备2026013896号-1
      </a>
      <span className="text-border">·</span>
      <a
        href="https://beian.mps.gov.cn"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <ShieldCheck className="size-3" />
        皖公网安备34082602221162号
      </a>
    </footer>
  )
}
