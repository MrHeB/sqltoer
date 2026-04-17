import { useState, useRef, useCallback, useEffect } from "react"
import * as pdfjsLib from "pdfjs-dist"
import { PDFDocument, degrees } from "pdf-lib"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Upload, Download, GripVertical, RotateCw, Trash2,
  Merge, Split, LayoutGrid,
} from "lucide-react"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

type Mode = "merge" | "split" | "manage"

/* ========== Types ========== */
interface PdfFileInfo {
  id: string
  name: string
  data: Uint8Array
  pageCount: number
}

interface ThumbnailInfo {
  pageNum: number
  rotation: number
  deleted: boolean
}

/* ========== Helpers ========== */
function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parsePageRanges(input: string, maxPage: number): number[][] {
  const ranges: number[][] = []
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean)
  for (const part of parts) {
    const dashParts = part.split("-").map((s) => parseInt(s.trim(), 10))
    if (dashParts.length === 1 && dashParts[0] >= 1 && dashParts[0] <= maxPage) {
      ranges.push([dashParts[0]])
    } else if (dashParts.length === 2 && dashParts[0] >= 1 && dashParts[1] <= maxPage && dashParts[0] <= dashParts[1]) {
      const group: number[] = []
      for (let i = dashParts[0]; i <= dashParts[1]; i++) group.push(i)
      ranges.push(group)
    }
  }
  return ranges
}

/* ========== Main Component ========== */
export function PdfMergePage() {
  const [mode, setMode] = useState<Mode>("merge")
  const [files, setFiles] = useState<PdfFileInfo[]>([])
  const [rangeInput, setRangeInput] = useState("")
  const [thumbnails, setThumbnails] = useState<ThumbnailInfo[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItemRef = useRef<number | null>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    e.target.value = ""
    if (!fileList) return

    const newFiles: PdfFileInfo[] = []
    for (const file of Array.from(fileList)) {
      if (!file.name.toLowerCase().endsWith(".pdf")) continue
      try {
        const buffer = await file.arrayBuffer()
        const data = new Uint8Array(buffer)
        const pdf = await PDFDocument.load(data)
        newFiles.push({ id: uid(), name: file.name, data, pageCount: pdf.getPageCount() })
      } catch {
        // Skip files that fail to parse
      }
    }

    if (mode === "split" || mode === "manage") {
      if (newFiles.length > 0) {
        setFiles([newFiles[0]])
        if (mode === "manage") {
          const pdf = await PDFDocument.load(newFiles[0].data)
          const count = pdf.getPageCount()
          setThumbnails(
            Array.from({ length: count }, (_, i) => ({
              pageNum: i + 1,
              rotation: 0,
              deleted: false,
            }))
          )
        }
      }
    } else {
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [mode])

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  /* ---- Merge ---- */
  const handleMerge = useCallback(async () => {
    if (files.length < 2) return
    setIsProcessing(true)
    try {
      const merged = await PDFDocument.create()
      for (const file of files) {
        const src = await PDFDocument.load(file.data)
        const pages = await merged.copyPages(src, src.getPageIndices())
        for (const page of pages) merged.addPage(page)
      }
      const bytes = await merged.save()
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "merged.pdf")
    } finally {
      setIsProcessing(false)
    }
  }, [files])

  /* ---- Split ---- */
  const handleSplit = useCallback(async () => {
    if (files.length === 0 || !rangeInput.trim()) return
    setIsProcessing(true)
    try {
      const srcDoc = await PDFDocument.load(files[0].data)
      const maxPage = srcDoc.getPageCount()
      const groups = parsePageRanges(rangeInput, maxPage)

      for (let i = 0; i < groups.length; i++) {
        const newDoc = await PDFDocument.create()
        const indices = groups[i].map((p) => p - 1)
        const pages = await newDoc.copyPages(srcDoc, indices)
        for (const page of pages) newDoc.addPage(page)
        const bytes = await newDoc.save()
        downloadBlob(
          new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
          `split_${i + 1}_pages_${groups[i].join("-")}.pdf`
        )
      }
    } finally {
      setIsProcessing(false)
    }
  }, [files, rangeInput])

  /* ---- Manage: rotate / delete / reorder / export ---- */
  const rotateThumbnail = useCallback((pageNum: number) => {
    setThumbnails((prev) =>
      prev.map((t) => (t.pageNum === pageNum ? { ...t, rotation: (t.rotation + 90) % 360 } : t))
    )
  }, [])

  const deleteThumbnail = useCallback((pageNum: number) => {
    setThumbnails((prev) =>
      prev.map((t) => (t.pageNum === pageNum ? { ...t, deleted: !t.deleted } : t))
    )
  }, [])

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    const from = dragItemRef.current
    if (from === null || from === index) return
    setThumbnails((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(from, 1)
      updated.splice(index, 0, moved)
      return updated
    })
    dragItemRef.current = index
  }, [])

  const handleExportManaged = useCallback(async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    try {
      const srcDoc = await PDFDocument.load(files[0].data)
      const newDoc = await PDFDocument.create()
      const activeThumbs = thumbnails.filter((t) => !t.deleted)
      const indices = activeThumbs.map((t) => t.pageNum - 1)
      const pages = await newDoc.copyPages(srcDoc, indices)
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        const thumb = activeThumbs[i]
        if (thumb.rotation !== 0) {
          page.setRotation(degrees(page.getRotation().angle + thumb.rotation))
        }
        newDoc.addPage(page)
      }
      const bytes = await newDoc.save()
      downloadBlob(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), "managed.pdf")
    } finally {
      setIsProcessing(false)
    }
  }, [files, thumbnails])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">PDF 合并拆分</h1>
          <p className="text-xs text-muted-foreground">合并、拆分、页面管理</p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {/* Mode selector */}
          <div className="flex gap-1">
            {([
              { key: "merge" as Mode, icon: Merge, label: "合并" },
              { key: "split" as Mode, icon: Split, label: "拆分" },
              { key: "manage" as Mode, icon: LayoutGrid, label: "管理" },
            ]).map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                size="sm"
                variant={mode === key ? "default" : "outline"}
                onClick={() => setMode(key)}
                className="flex-1"
              >
                <Icon className="size-3.5" /> {label}
              </Button>
            ))}
          </div>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple={mode === "merge"}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
            <Upload className="size-4" />
            {mode === "merge" ? "选择 PDF 文件（可多选）" : "选择 PDF 文件"}
          </Button>

          {/* File list (merge mode) */}
          {mode === "merge" && files.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium">文件列表（拖拽排序）</label>
              {files.map((file, index) => (
                <MergeFileItem
                  key={file.id}
                  file={file}
                  index={index}
                  onDragStart={() => {
                    dragItemRef.current = index
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    const from = dragItemRef.current
                    if (from === null || from === index) return
                    setFiles((prev) => {
                      const updated = [...prev]
                      const [moved] = updated.splice(from, 1)
                      updated.splice(index, 0, moved)
                      return updated
                    })
                    dragItemRef.current = index
                  }}
                  onRemove={() => removeFile(file.id)}
                />
              ))}
              <Button onClick={handleMerge} disabled={files.length < 2 || isProcessing} className="w-full mt-2">
                {isProcessing ? "处理中..." : `合并 ${files.length} 个文件`}
              </Button>
            </div>
          )}

          {/* Split controls */}
          {mode === "split" && files.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium">页码范围</label>
              <p className="text-[11px] text-muted-foreground">
                共 {files[0].pageCount} 页。示例: 1-3, 5, 7-10
              </p>
              <Input
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder="1-3, 5, 7-10"
              />
              <Button onClick={handleSplit} disabled={!rangeInput.trim() || isProcessing} className="w-full">
                {isProcessing ? "处理中..." : "拆分 PDF"}
              </Button>
            </div>
          )}

          {/* Manage controls */}
          {mode === "manage" && files.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                共 {thumbnails.length} 页，{thumbnails.filter((t) => t.deleted).length} 页已标记删除
              </p>
              <Button onClick={handleExportManaged} disabled={isProcessing} className="w-full">
                <Download className="size-4" />
                {isProcessing ? "处理中..." : "导出 PDF"}
              </Button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 bg-muted/30 overflow-auto p-6">
        {mode === "merge" && (
          <MergeMainContent files={files} />
        )}
        {mode === "split" && (
          <SplitMainContent file={files[0] ?? null} />
        )}
        {mode === "manage" && (
          <ManageMainContent
            fileData={files[0]?.data ?? null}
            thumbnails={thumbnails}
            onRotate={rotateThumbnail}
            onDelete={deleteThumbnail}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
          />
        )}
      </main>
    </div>
  )
}

/* ========== Merge File Item ========== */
function MergeFileItem({
  file,
  onDragStart,
  onDragOver,
  onRemove,
}: {
  file: PdfFileInfo
  index: number
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onRemove: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{file.name}</span>
      <span className="text-muted-foreground">{file.pageCount}页</span>
      <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 className="size-3" />
      </button>
    </div>
  )
}

/* ========== Merge Main Content ========== */
function MergeMainContent({ files }: { files: PdfFileInfo[] }) {
  if (files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>上传多个 PDF 文件进行合并</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">待合并文件 ({files.length})</h2>
      <div className="space-y-2">
        {files.map((file) => (
          <div key={file.id} className="rounded-lg bg-background px-4 py-3 text-sm">
            <span className="font-medium">{file.name}</span>
            <span className="ml-2 text-muted-foreground">{file.pageCount} 页</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">拖拽侧边栏中的文件条目可调整合并顺序</p>
    </div>
  )
}

/* ========== Split Main Content ========== */
function SplitMainContent({ file }: { file: PdfFileInfo | null }) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>上传一个 PDF 文件进行拆分</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">拆分 PDF</h2>
      <div className="rounded-lg bg-background px-4 py-3 text-sm">
        <span className="font-medium">{file.name}</span>
        <span className="ml-2 text-muted-foreground">{file.pageCount} 页</span>
      </div>
      <p className="text-xs text-muted-foreground">在左侧输入页码范围后点击「拆分 PDF」</p>
    </div>
  )
}

/* ========== Manage Main Content ========== */
function ManageMainContent({
  fileData,
  thumbnails,
  onRotate,
  onDelete,
  onDragStart,
  onDragOver,
}: {
  fileData: Uint8Array | null
  thumbnails: ThumbnailInfo[]
  onRotate: (pageNum: number) => void
  onDelete: (pageNum: number) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
}) {
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())

  useEffect(() => {
    if (!fileData) return

    const currentData = fileData
    let cancelled = false
    async function renderThumbs() {
      const pdf = await pdfjsLib.getDocument({ data: currentData.slice() }).promise
      for (const thumb of thumbnails) {
        if (cancelled) return
        if (thumb.deleted) continue
        const canvas = canvasRefs.current.get(thumb.pageNum)
        if (!canvas) continue
        try {
          const page = await pdf.getPage(thumb.pageNum)
          const viewport = page.getViewport({ scale: 0.4 })
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext("2d")
          if (!ctx) continue
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          await page.render({ canvas, canvasContext: ctx, viewport }).promise
        } catch {
          // Skip pages that fail to render
        }
      }
    }

    renderThumbs()
    return () => { cancelled = true }
  }, [fileData, thumbnails])

  if (!fileData) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>上传一个 PDF 文件进行页面管理</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">页面管理 ({thumbnails.filter((t) => !t.deleted).length} 页)</h2>
      <div className="grid grid-cols-4 gap-3">
        {thumbnails.map((thumb, index) => (
          <div
            key={thumb.pageNum}
            draggable
            onDragStart={() => onDragStart(index)}
            onDragOver={(e) => onDragOver(e, index)}
            className={`relative flex flex-col items-center rounded-lg border bg-background p-2 cursor-grab active:cursor-grabbing transition-opacity ${
              thumb.deleted ? "opacity-30 border-destructive" : "border-border"
            }`}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(thumb.pageNum, el)
              }}
              className="rounded"
              style={{ transform: `rotate(${thumb.rotation}deg)` }}
            />
            <span className="mt-1 text-xs text-muted-foreground">第 {thumb.pageNum} 页</span>
            <div className="absolute right-1 top-1 flex gap-0.5">
              <button
                onClick={() => onRotate(thumb.pageNum)}
                className="rounded bg-background/80 p-0.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCw className="size-3" />
              </button>
              <button
                onClick={() => onDelete(thumb.pageNum)}
                className="rounded bg-background/80 p-0.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
