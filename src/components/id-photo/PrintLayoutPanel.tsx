import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { generatePrintPdf, calculateGridLayout } from "@/lib/id-photo/print-layout"
import { downloadBlob } from "@/lib/id-photo/image-operations"
import { exportCanvas } from "@/lib/id-photo/image-operations"
import { PHOTO_SIZE_TEMPLATES } from "@/lib/id-photo/standards"
import type { PrintLayoutConfig } from "@/types/id-photo"

interface PrintLayoutPanelProps {
  processedCanvas: HTMLCanvasElement | null
  selectedSizeId: string
}

export function PrintLayoutPanel({ processedCanvas, selectedSizeId }: PrintLayoutPanelProps) {
  const [config, setConfig] = useState<PrintLayoutConfig>({ paperSize: "A4", gapMm: 3 })
  const [isGenerating, setIsGenerating] = useState(false)

  const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === selectedSizeId)

  const layout = template
    ? calculateGridLayout(template.widthMm, template.heightMm, config.paperSize, config.gapMm)
    : null

  const handleGenerate = useCallback(async () => {
    if (!processedCanvas || !template) return
    setIsGenerating(true)
    try {
      const photoBlob = await exportCanvas(processedCanvas, "png")
      const pdfBytes = await generatePrintPdf(
        photoBlob,
        template.widthMm,
        template.heightMm,
        config.paperSize,
        config.gapMm,
      )
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" })
      downloadBlob(blob, `证件照排版_${config.paperSize}.pdf`)
    } finally {
      setIsGenerating(false)
    }
  }, [processedCanvas, template, config])

  if (!processedCanvas || !template) return null

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

      {layout && (
        <p className="text-xs text-muted-foreground">
          {layout.cols}×{layout.rows} = {layout.positions.length} 张/{config.paperSize}纸
        </p>
      )}

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
