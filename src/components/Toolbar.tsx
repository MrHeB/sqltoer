import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export type ErMode = "relational" | "chen"

interface ToolbarProps {
  mode: ErMode
  fontSize: number
  cardWidth: number
  borderWidth: number
  onModeChange: (mode: ErMode) => void
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onBorderWidthChange: (width: number) => void
  onExport: (format: "png" | "svg") => void
}

export function Toolbar({
  mode,
  fontSize,
  cardWidth,
  borderWidth,
  onModeChange,
  onFontSizeChange,
  onCardWidthChange,
  onBorderWidthChange,
  onExport,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-1">
        <Button variant={mode === "relational" ? "default" : "outline"} size="sm" onClick={() => onModeChange("relational")}>
          关系模式
        </Button>
        <Button variant={mode === "chen" ? "default" : "outline"} size="sm" onClick={() => onModeChange("chen")}>
          陈氏模式
        </Button>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">字号</span>
        <Input
          type="number"
          min={8}
          max={32}
          value={fontSize}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v >= 8 && v <= 32) onFontSizeChange(v)
          }}
          className="w-16 h-7 text-xs text-center"
        />
        <span className="text-xs text-muted-foreground">px</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">卡片宽度</span>
        <Input
          type="number"
          min={100}
          max={600}
          step={10}
          value={cardWidth}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v >= 100 && v <= 600) onCardWidthChange(v)
          }}
          className="w-16 h-7 text-xs text-center"
        />
        <span className="text-xs text-muted-foreground">px</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">框线粗细</span>
        <Input
          type="number"
          min={0}
          max={6}
          value={borderWidth}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v) && v >= 0 && v <= 6) onBorderWidthChange(v)
          }}
          className="w-16 h-7 text-xs text-center"
        />
        <span className="text-xs text-muted-foreground">px</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-2 ml-auto">
        <Button variant="outline" size="sm" onClick={() => onExport("svg")}>
          导出 SVG
        </Button>
        <Button variant="outline" size="sm" onClick={() => onExport("png")}>
          导出 PNG
        </Button>
      </div>
    </div>
  )
}
