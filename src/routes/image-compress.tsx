import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Upload, Download, Trash2, ImagePlus } from "lucide-react"

interface ImageItem {
  id: string
  file: File
  originalUrl: string
  compressedUrl: string | null
  compressedBlob: Blob | null
  originalSize: number
  compressedSize: number
  quality: number
  status: "pending" | "compressing" | "done" | "error"
}

function compressImage(file: File, quality: number): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0)
      const mimeType = file.type === "image/png" ? "image/webp" : file.type
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) return reject(new Error("压缩失败"))
          resolve({ blob, url: URL.createObjectURL(blob) })
        },
        mimeType,
        quality / 100,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("图片加载失败"))
    }
    img.src = url
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function ImageCompressPage() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [quality, setQuality] = useState(75)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: ImageItem[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        originalUrl: URL.createObjectURL(f),
        compressedUrl: null,
        compressedBlob: null,
        originalSize: f.size,
        compressedSize: 0,
        quality: 75,
        status: "pending" as const,
      }))
    setImages((prev) => [...prev, ...newItems])
  }, [])

  const compressAll = useCallback(async () => {
    const pending = images.filter((img) => img.status !== "compressing")
    for (const img of pending) {
      setImages((prev) =>
        prev.map((item) => (item.id === img.id ? { ...item, status: "compressing" as const, quality } : item)),
      )
      try {
        const { blob, url } = await compressImage(img.file, quality)
        setImages((prev) =>
          prev.map((item) =>
            item.id === img.id
              ? { ...item, compressedUrl: url, compressedBlob: blob, compressedSize: blob.size, status: "done" as const, quality }
              : item,
          ),
        )
      } catch {
        setImages((prev) => prev.map((item) => (item.id === img.id ? { ...item, status: "error" as const } : item)))
      }
    }
  }, [images, quality])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) {
        URL.revokeObjectURL(item.originalUrl)
        if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl)
      }
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const downloadImage = useCallback((item: ImageItem) => {
    if (!item.compressedBlob) return
    const ext = item.compressedBlob.type === "image/webp" ? ".webp" : ".jpg"
    const name = item.file.name.replace(/\.[^.]+$/, "") + `_compressed${ext}`
    const a = document.createElement("a")
    a.href = item.compressedUrl!
    a.download = name
    a.click()
  }, [])

  const downloadAll = useCallback(() => {
    images.filter((img) => img.status === "done").forEach(downloadImage)
  }, [images, downloadImage])

  const clearAll = useCallback(() => {
    images.forEach((item) => {
      URL.revokeObjectURL(item.originalUrl)
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl)
    })
    setImages([])
  }, [images])

  const totalOriginal = images.reduce((sum, img) => sum + img.originalSize, 0)
  const totalCompressed = images.reduce((sum, img) => sum + img.compressedSize, 0)
  const doneCount = images.filter((img) => img.status === "done").length

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">图片压缩</h1>
          <p className="text-xs text-muted-foreground">在线压缩图片，支持 JPG/PNG/WebP</p>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">压缩质量</label>
              <span className="text-xs text-muted-foreground">{quality}%</span>
            </div>
            <Slider value={[quality]} onValueChange={(v) => setQuality(Array.isArray(v) ? v[0] : v)} min={1} max={100} step={1} />
          </div>
          <Button onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="size-4" /> 选择图片
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          {images.length > 0 && (
            <>
              <Button onClick={compressAll} disabled={images.length === 0}>
                压缩全部
              </Button>
              {doneCount > 0 && (
                <Button variant="outline" onClick={downloadAll}>
                  <Download className="size-4" /> 下载全部
                </Button>
              )}
              <Button variant="ghost" onClick={clearAll} className="text-destructive hover:text-destructive">
                <Trash2 className="size-4" /> 清空全部
              </Button>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>共 {images.length} 张图片，已完成 {doneCount} 张</p>
                {totalCompressed > 0 && (
                  <p>
                    总大小：{formatSize(totalOriginal)} → {formatSize(totalCompressed)}
                    （节省 {((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%）
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </aside>
      <main className="flex-1 bg-muted/30 overflow-auto p-6">
        {images.length === 0 ? (
          <div
            className={`flex h-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); e.dataTransfer.files && addFiles(e.dataTransfer.files) }}
          >
            <Upload className="size-10 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">拖拽图片到这里</p>
              <p className="text-xs text-muted-foreground">或点击左侧「选择图片」按钮上传</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {images.map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="flex-1 truncate text-xs font-medium">{item.file.name}</span>
                  {item.status === "done" && (
                    <span className="text-xs text-emerald-600">
                      -{((1 - item.compressedSize / item.originalSize) * 100).toFixed(1)}%
                    </span>
                  )}
                  {item.status === "compressing" && (
                    <span className="text-xs text-muted-foreground">压缩中...</span>
                  )}
                  {item.status === "error" && (
                    <span className="text-xs text-destructive">失败</span>
                  )}
                  <Button size="icon-xs" variant="ghost" onClick={() => removeImage(item.id)}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                <div className="flex">
                  <div className="flex-1 border-r border-border p-2">
                    <p className="mb-1 text-center text-[10px] text-muted-foreground">原图 · {formatSize(item.originalSize)}</p>
                    <img src={item.originalUrl} alt="原图" className="mx-auto max-h-40 rounded object-contain" />
                  </div>
                  <div className="flex-1 p-2">
                    <p className="mb-1 text-center text-[10px] text-muted-foreground">
                      {item.status === "done" ? `压缩后 · ${formatSize(item.compressedSize)}` : "等待压缩"}
                    </p>
                    {item.compressedUrl ? (
                      <>
                        <img src={item.compressedUrl} alt="压缩后" className="mx-auto max-h-40 rounded object-contain" />
                        <div className="mt-2 flex justify-center">
                          <Button size="xs" variant="outline" onClick={() => downloadImage(item)}>
                            <Download className="size-3" /> 下载
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
                        {item.status === "compressing" ? "压缩中..." : item.status === "error" ? "压缩失败" : "等待压缩"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
