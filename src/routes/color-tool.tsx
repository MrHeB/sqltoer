import { useState, useMemo } from "react"
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from "@/lib/color-tool/conversions"
import { generatePalette, generateMonochromatic, type PaletteType } from "@/lib/color-tool/palette"
import { contrastRatio, wcagCheck } from "@/lib/color-tool/contrast"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

const PALETTE_LABELS: Record<PaletteType, string> = {
  complementary: "互补色",
  analogous: "类似色",
  triadic: "三色",
  "split-complementary": "分裂互补",
  monochromatic: "单色",
}

export function ColorToolPage() {
  const [hex, setHex] = useState("#438edb")
  const [fgHex, setFgHex] = useState("#ffffff")
  const [paletteType, setPaletteType] = useState<PaletteType>("complementary")
  const [gradientFrom, setGradientFrom] = useState("#438edb")
  const [gradientTo, setGradientTo] = useState("#6fb1fc")
  const [gradientAngle, setGradientAngle] = useState(90)
  const [copied, setCopied] = useState("")

  const rgb = useMemo(() => hexToRgb(hex), [hex])
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb])

  const palette = useMemo(
    () => paletteType === "monochromatic" ? generateMonochromatic(hsl) : generatePalette(hsl, paletteType),
    [hsl, paletteType],
  )

  const gradientCss = `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`

  const fgRgb = hexToRgb(fgHex)
  const bgRgb = hexToRgb(hex)
  const ratio = contrastRatio(fgRgb, bgRgb)
  const wcag = wcagCheck(ratio)

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(""), 1500)
  }

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">颜色工具</h1>
          <p className="text-xs text-muted-foreground">取色、调色板、渐变、对比度</p>
        </div>

        <div className="flex flex-col gap-4 p-4">
          {/* 取色器 */}
          <div className="space-y-2">
            <label className="text-xs font-medium">基础颜色</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded border border-border p-0.5"
              />
              <div className="flex-1 space-y-1">
                <InputRow label="HEX" value={hex} onChange={(v) => setHex(v)} />
                <InputRow label="RGB" value={`${rgb.r}, ${rgb.g}, ${rgb.b}`} onChange={(v) => {
                  const parts = v.split(",").map((s) => parseInt(s.trim()))
                  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                    setHex(rgbToHex({ r: parts[0], g: parts[1], b: parts[2] }))
                  }
                }} />
                <InputRow label="HSL" value={`${hsl.h}, ${hsl.s}%, ${hsl.l}%`} onChange={(v) => {
                  const parts = v.replace(/%/g, "").split(",").map((s) => parseInt(s.trim()))
                  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
                    setHex(rgbToHex(hslToRgb({ h: parts[0], s: parts[1], l: parts[2] })))
                  }
                }} />
              </div>
            </div>
          </div>

          {/* 调色板 */}
          <div className="space-y-2">
            <label className="text-xs font-medium">调色板</label>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(PALETTE_LABELS) as PaletteType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setPaletteType(type)}
                  className={`rounded-md px-2 py-1 text-xs transition-colors ${
                    paletteType === type ? "bg-primary text-primary-foreground" : "bg-accent/50 hover:bg-accent"
                  }`}
                >
                  {PALETTE_LABELS[type]}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {palette.map((color, i) => (
                <button
                  key={i}
                  onClick={() => copy(color, `pal-${i}`)}
                  className="group relative h-10 flex-1 rounded-md border border-border transition-transform hover:scale-105"
                  style={{ background: color }}
                  title={color}
                >
                  {copied === `pal-${i}` && (
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xs drop-shadow">
                      <Check className="size-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 渐变 */}
          <div className="space-y-2">
            <label className="text-xs font-medium">渐变生成器</label>
            <div className="flex items-center gap-2">
              <input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border p-0.5" />
              <span className="text-xs text-muted-foreground">→</span>
              <input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-border p-0.5" />
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">{gradientAngle}°</label>
                <input type="range" min={0} max={360} value={gradientAngle} onChange={(e) => setGradientAngle(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
          </div>

          {/* 对比度 */}
          <div className="space-y-2">
            <label className="text-xs font-medium">对比度检测 (WCAG)</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">前景</span>
                <input type="color" value={fgHex} onChange={(e) => setFgHex(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border p-0.5" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">背景</span>
                <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border p-0.5" />
              </div>
            </div>
            <div
              className="rounded-md px-3 py-2 text-sm"
              style={{ background: hex, color: fgHex }}
            >
              示例文字 Aa {ratio.toFixed(2)}:1
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <Badge pass={wcag.aa}>AA 普通</Badge>
              <Badge pass={wcag.aaa}>AAA 普通</Badge>
              <Badge pass={wcag.aaLarge}>AA 大字</Badge>
              <Badge pass={wcag.aaaLarge}>AAA 大字</Badge>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-muted/30 overflow-auto">
        <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
          {/* 颜色大预览 */}
          <div className="flex gap-4">
            <div className="h-48 w-48 rounded-xl shadow-lg border border-border" style={{ background: hex }} />
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-mono">{hex}</span>
              <span className="font-mono text-muted-foreground">rgb({rgb.r}, {rgb.g}, {rgb.b})</span>
              <span className="font-mono text-muted-foreground">hsl({hsl.h}, {hsl.s}%, {hsl.l}%)</span>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => copy(hex, "hex-main")}>
                {copied === "hex-main" ? <Check className="size-3" /> : <Copy className="size-3" />}
                复制 HEX
              </Button>
            </div>
          </div>

          {/* 调色板预览 */}
          <div className="flex gap-2">
            {palette.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-16 w-24 rounded-lg border border-border shadow-sm" style={{ background: color }} />
                <span className="text-xs font-mono text-muted-foreground">{color}</span>
              </div>
            ))}
          </div>

          {/* 渐变预览 */}
          <div className="w-full max-w-xl space-y-2">
            <div className="h-24 rounded-xl border border-border shadow-sm" style={{ background: gradientCss }} />
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-accent/50 px-3 py-2 text-xs font-mono">
                background: {gradientCss};
              </code>
              <Button size="sm" variant="outline" onClick={() => copy(`background: ${gradientCss};`, "grad-css")}>
                {copied === "grad-css" ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function InputRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-8 text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-xs font-mono"
      />
    </div>
  )
}

function Badge({ pass, children }: { pass: boolean; children: React.ReactNode }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-center ${pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {pass ? "✓" : "✗"} {children}
    </span>
  )
}
