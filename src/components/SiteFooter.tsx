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
    </footer>
  )
}
