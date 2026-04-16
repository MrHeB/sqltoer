import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { generatePrintPdf, calculateGridLayout } from "@/lib/id-photo/print-layout"
import { downloadBlob, exportCanvas } from "@/lib/id-photo/image-operations"
import { PHOTO_SIZE_TEMPLATES, PAPER_SIZES } from "@/lib/id-photo/standards"
import type { PrintLayoutConfig } from "@/types/id-photo"

interface PrintLayoutPanelProps {
  processedCanvas: HTMLCanvasElement | null
  selectedSizeId: string
}

export function PrintLayoutPanel({ processedCanvas, selectedSizeId }: PrintLayoutPanelProps) {
  const template = useMemo(() => {
    if (selectedSizeId === "custom") return null
    return PHOTO_SIZE_TEMPLATES.find((t) => t.id === selectedSizeId) ?? null
  }, [selectedSizeId])

  const photoW = template?.widthMm ?? 25
  const photoH = template?.heightMm ?? 35

  const [config, setConfig] = useState<PrintLayoutConfig>({ paperSize: "A4", gapMm: 3, cols: null, rows: null })
  const [isGenerating, setIsGenerating] = useState(false)

  // 自动计算布局
  const autoLayout = useMemo(() =>
    calculateGridLayout(photoW, photoH, config.paperSize, config.gapMm),
    [photoW, photoH, config.paperSize, config.gapMm],
  )

  // 如果用户自定义了行列，使用用户的
  const layout = useMemo(() => {
    if (!config.cols || !config.rows) return autoLayout
    const paper = PAPER_SIZES[config.paperSize]
    const usedW = config.cols * photoW + (config.cols - 1) * config.gapMm
    const usedH = config.rows * photoH + (config.rows - 1) * config.gapMm
    const offsetX = (paper.widthMm - usedW) / 2
    const offsetY = (paper.heightMm - usedH) / 2
    const positions: { x: number; y: number }[] = []
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        positions.push({
          x: offsetX + c * (photoW + config.gapMm),
          y: offsetY + r * (photoH + config.gapMm),
        })
      }
    }
    return { cols: config.cols, rows: config.rows, positions }
  }, [config.cols, config.rows, config.paperSize, config.gapMm, photoW, photoH, autoLayout])

  const handleGenerate = useCallback(async () => {
    if (!processedCanvas || !template) return
    setIsGenerating(true)
    try {
      const photoBlob = await exportCanvas(processedCanvas, "png")
      const pdfBytes = await generatePrintPdf(
        photoBlob, photoW, photoH, config.paperSize, config.gapMm, config.cols, config.rows,
      )
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      downloadBlob(blob, `证件照排版_${config.paperSize}.pdf`)
    } finally {
      setIsGenerating(false)
    }
  }, [processedCanvas, template, photoW, photoH, config])

  if (!processedCanvas || !template) return null

  const paper = PAPER_SIZES[config.paperSize]
  const previewScale = Math.min(200 / paper.widthMm, 280 / paper.heightMm)

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">纸张</label>
        <div className="flex gap-1.5">
          {(["A4", "5R"] as const).map((size) => (
            <button
              key={size}
              onClick={() => setConfig((c) => ({ ...c, paperSize: size }))}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                config.paperSize === size
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/50 hover:bg-accent"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">
          间距: {config.gapMm}mm
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={config.gapMm}
          onChange={(e) => setConfig((c) => ({ ...c, gapMm: Number(e.target.value) }))}
          className="w-full accent-primary"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">列数</label>
          <input
            type="number"
            min={1}
            max={10}
            placeholder={`自动(${autoLayout.cols})`}
            value={config.cols ?? ""}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null
              setConfig((c) => ({ ...c, cols: v }))
            }}
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">行数</label>
          <input
            type="number"
            min={1}
            max={10}
            placeholder={`自动(${autoLayout.rows})`}
            value={config.rows ?? ""}
            onChange={(e) => {
              const v = e.target.value ? Number(e.target.value) : null
              setConfig((c) => ({ ...c, rows: v }))
            }}
            className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs"
          />
        </div>
      </div>

      {/* 排版预览 */}
      <div className="flex justify-center">
        <div
          className="relative border border-border bg-white"
          style={{
            width: paper.widthMm * previewScale,
            height: paper.heightMm * previewScale,
          }}
        >
          {layout.positions.map((pos, i) => (
            <div
              key={i}
              className="absolute border border-primary/30 bg-primary/10"
              style={{
                left: pos.x * previewScale,
                top: pos.y * previewScale,
                width: photoW * previewScale,
                height: photoH * previewScale,
              }}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {layout.cols}×{layout.rows} = {layout.positions.length} 张/{config.paperSize}
      </p>

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        <Download className="size-3.5" />
        {isGenerating ? "生成中..." : "下载排版 PDF"}
      </Button>
    </div>
  )
}
