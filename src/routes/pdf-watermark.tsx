import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { usePdfPreview } from "@/hooks/usePdfPreview"
import { addWatermark, type WatermarkOptions } from "@/lib/pdf-watermark"
import { Upload, Download, ChevronLeft, ChevronRight } from "lucide-react"

export function PdfWatermarkPage() {
  const [sourcePdf, setSourcePdf] = useState<Uint8Array | null>(null)
  const [resultPdf, setResultPdf] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const [text, setText] = useState("机密文件")
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.15)
  const [rotation, setRotation] = useState(-30)
  const [color, setColor] = useState("#999999")
  const [mode, setMode] = useState<WatermarkOptions["mode"]>("tile")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { canvasRef, currentPage, totalPages, nextPage, prevPage } = usePdfPreview(resultPdf)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResultPdf(null)
    file.arrayBuffer().then((buf) => setSourcePdf(new Uint8Array(buf)))
  }, [])

  const handleAddWatermark = useCallback(async () => {
    if (!sourcePdf) return
    setIsProcessing(true)
    try {
      const result = await addWatermark(sourcePdf, {
        text,
        fontSize,
        opacity,
        rotation,
        color,
        mode,
      })
      setResultPdf(result)
    } finally {
      setIsProcessing(false)
    }
  }, [sourcePdf, text, fontSize, opacity, rotation, color, mode])

  const handleDownload = useCallback(() => {
    if (!resultPdf) return
    const blob = new Blob([resultPdf.buffer as ArrayBuffer], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName.replace(/\.pdf$/i, "") + "_watermarked.pdf"
    a.click()
    URL.revokeObjectURL(url)
  }, [resultPdf, fileName])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">PDF 加水印</h1>
          <p className="text-xs text-muted-foreground">上传 PDF 文件，添加文字水印</p>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-4" />
              {fileName || "选择 PDF 文件"}
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">水印文字</label>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="输入水印文字" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">字体大小: {fontSize}</label>
            <Slider value={[fontSize]} min={12} max={120} onValueChange={(v) => setFontSize(Array.isArray(v) ? v[0] : v)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">透明度: {opacity.toFixed(2)}</label>
            <Slider value={[opacity * 100]} min={5} max={100} onValueChange={(v) => setOpacity((Array.isArray(v) ? v[0] : v) / 100)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">旋转角度: {rotation}°</label>
            <Slider value={[rotation + 90]} min={0} max={180} onValueChange={(v) => setRotation((Array.isArray(v) ? v[0] : v) - 90)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">颜色</label>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-16 p-0.5 cursor-pointer" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">模式</label>
            <div className="flex gap-2">
              <Button
                variant={mode === "center" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("center")}
              >
                居中
              </Button>
              <Button
                variant={mode === "tile" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("tile")}
              >
                平铺
              </Button>
            </div>
          </div>

          <Button onClick={handleAddWatermark} disabled={!sourcePdf || isProcessing} className="w-full">
            {isProcessing ? "处理中..." : "添加水印"}
          </Button>

          {resultPdf && (
            <Button variant="outline" onClick={handleDownload} className="w-full">
              <Download className="size-4" />
              下载水印 PDF
            </Button>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center bg-muted/30 overflow-auto">
        {resultPdf ? (
          <div className="flex flex-col items-center gap-3 p-6">
            <canvas ref={canvasRef} className="max-h-[calc(100vh-10rem)] rounded shadow-lg" />
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon-sm" onClick={prevPage} disabled={currentPage <= 1}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button variant="outline" size="icon-sm" onClick={nextPage} disabled={currentPage >= totalPages}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">上传 PDF 并配置水印参数后，点击「添加水印」预览效果</p>
        )}
      </main>
    </div>
  )
}
