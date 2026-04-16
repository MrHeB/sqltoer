import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePdfPreview } from "@/hooks/usePdfPreview"
import { removeWatermark, type RemoveMode, type RemoveResult } from "@/lib/pdf-remove-watermark"
import { Upload, Download, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"

export function PdfRemoveWatermarkPage() {
  const [sourcePdf, setSourcePdf] = useState<Uint8Array | null>(null)
  const [resultPdf, setResultPdf] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [removeResult, setRemoveResult] = useState<RemoveResult | null>(null)
  const [mode, setMode] = useState<RemoveMode>("auto")
  const [threshold, setThreshold] = useState(200)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { canvasRef, currentPage, totalPages, nextPage, prevPage } = usePdfPreview(resultPdf)

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResultPdf(null)
    setRemoveResult(null)
    file.arrayBuffer().then((buf) => setSourcePdf(new Uint8Array(buf)))
  }, [])

  const handleRemove = useCallback(async () => {
    if (!sourcePdf) return
    setIsProcessing(true)
    try {
      const result = await removeWatermark(sourcePdf, mode, threshold)
      setResultPdf(result.pdfBytes)
      setRemoveResult(result)
    } finally {
      setIsProcessing(false)
    }
  }, [sourcePdf, mode, threshold])

  const handleDownload = useCallback(() => {
    if (!resultPdf) return
    const blob = new Blob([resultPdf.buffer as ArrayBuffer], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName.replace(/\.pdf$/i, "") + "_cleaned.pdf"
    a.click()
    URL.revokeObjectURL(url)
  }, [resultPdf, fileName])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">PDF 去水印</h1>
          <p className="text-xs text-muted-foreground">移除 PDF 中的文字水印</p>
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
            <label className="text-xs font-medium">处理模式</label>
            <div className="flex gap-2">
              <Button
                variant={mode === "auto" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("auto")}
              >
                智能移除
              </Button>
              <Button
                variant={mode === "deep" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("deep")}
              >
                深度清理
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {mode === "auto"
                ? "自动检测并移除注释水印和低透明度覆盖层"
                : "逐页渲染后通过图像处理移除浅色水印，效果更强但会栅格化内容"}
            </p>
          </div>

          {mode === "deep" && (
            <div className="space-y-1">
              <label className="text-xs font-medium">亮度阈值: {threshold}</label>
              <p className="text-[11px] text-muted-foreground">值越高，移除的像素越多（可能会误删浅色内容）</p>
              <Slider
                value={[threshold]}
                min={150}
                max={245}
                onValueChange={(v) => setThreshold(Array.isArray(v) ? v[0] : v)}
              />
            </div>
          )}

          <Button onClick={handleRemove} disabled={!sourcePdf || isProcessing} className="w-full">
            {isProcessing ? "处理中..." : "移除水印"}
          </Button>

          {removeResult && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
              {mode === "auto" ? (
                <>
                  <p>移除注释水印: {removeResult.removedAnnotations} 个</p>
                  <p>移除覆盖内容流: {removeResult.removedStreams} 个</p>
                </>
              ) : (
                <p>已处理 {removeResult.processedPages} 页（图像模式）</p>
              )}
            </div>
          )}

          {resultPdf && (
            <Button variant="outline" onClick={handleDownload} className="w-full">
              <Download className="size-4" />
              下载清理后的 PDF
            </Button>
          )}

          <div className="rounded-md border border-border px-3 py-2 flex gap-2">
            <AlertCircle className="size-4 shrink-0 mt-0.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {mode === "auto"
                ? "自动模式支持移除 PDF 注释水印和低透明度覆盖层。如效果不佳，请尝试「深度清理」模式。"
                : "深度清理会逐页渲染并移除浅色像素，对半透明灰色文字水印效果最好。"}
            </p>
          </div>
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
          <p className="text-sm text-muted-foreground">上传 PDF 文件后，点击「移除水印」进行处理</p>
        )}
      </main>
    </div>
  )
}
