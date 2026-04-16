import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { usePdfPreview } from "@/hooks/usePdfPreview"
import { removeWatermark, type RemoveResult } from "@/lib/pdf-remove-watermark"
import { Upload, Download, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"

export function PdfRemoveWatermarkPage() {
  const [sourcePdf, setSourcePdf] = useState<Uint8Array | null>(null)
  const [resultPdf, setResultPdf] = useState<Uint8Array | null>(null)
  const [fileName, setFileName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [removeResult, setRemoveResult] = useState<RemoveResult | null>(null)

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
      const result = await removeWatermark(sourcePdf)
      setResultPdf(result.pdfBytes)
      setRemoveResult(result)
    } finally {
      setIsProcessing(false)
    }
  }, [sourcePdf])

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
          <p className="text-xs text-muted-foreground">移除 PDF 中的结构化水印</p>
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

          <Button onClick={handleRemove} disabled={!sourcePdf || isProcessing} className="w-full">
            {isProcessing ? "处理中..." : "移除水印"}
          </Button>

          {removeResult && (
            <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
              <p>移除注释水印: {removeResult.removedAnnotations} 个</p>
              <p>移除覆盖层: {removeResult.removedOverlays} 个</p>
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
              支持移除 PDF 注释类型水印和低透明度覆盖层。对于已栅格化的水印（与内容混合）无法移除。
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
