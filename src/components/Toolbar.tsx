import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface ToolbarProps {
  fontSize: number
  cardWidth: number
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onExport: (format: "png" | "svg") => void
}

export function Toolbar({
  fontSize,
  cardWidth,
  onFontSizeChange,
  onCardWidthChange,
  onExport,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-border bg-background px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">字号</span>
        <Slider
          value={[fontSize]}
          min={10}
          max={20}
          step={1}
          onValueChange={(v) => onFontSizeChange(Array.isArray(v) ? v[0] : v)}
          className="w-24"
        />
        <span className="text-xs tabular-nums w-8">{fontSize}px</span>
      </div>

      <Separator orientation="vertical" className="h-4" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">卡片宽度</span>
        <Slider
          value={[cardWidth]}
          min={150}
          max={400}
          step={10}
          onValueChange={(v) => onCardWidthChange(Array.isArray(v) ? v[0] : v)}
          className="w-24"
        />
        <span className="text-xs tabular-nums w-10">{cardWidth}px</span>
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
