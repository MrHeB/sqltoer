import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Download, Upload } from "lucide-react"
import { exportCanvas, downloadBlob, fileToCanvas } from "@/lib/id-photo/image-operations"
import { removeImageBackground, applyBackgroundColor } from "@/lib/id-photo/background-removal"
import { cropImage, resizeImage, canvasToImageData, imageDataToCanvas } from "@/lib/id-photo/image-operations"
import { adjustBrightness, adjustContrast, adjustSaturation } from "@/lib/id-photo/image-operations"
import { skinSmooth, skinWhitening } from "@/lib/id-photo/beauty-filter"
import { PHOTO_SIZE_TEMPLATES, BG_COLOR_PRESETS } from "@/lib/id-photo/standards"
import type { IdPhotoState } from "@/types/id-photo"

interface BatchPanelProps {
  settings: Pick<IdPhotoState, "selectedSizeId" | "selectedBgColor" | "customBgColor" | "bgRemoved" | "brightness" | "contrast" | "saturation" | "smoothLevel" | "whiteningLevel">
}

export function BatchPanel({ settings }: BatchPanelProps) {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const inputId = "batch-file-input"

  const handleProcess = useCallback(async () => {
    if (files.length === 0) return
    setIsProcessing(true)
    setProgress(0)
    setTotal(files.length)

    const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === settings.selectedSizeId)!
    const bgColor = settings.selectedBgColor === "custom"
      ? settings.customBgColor
      : BG_COLOR_PRESETS.find((p) => p.id === settings.selectedBgColor)?.color ?? "#438edb"

    const CONCURRENCY = 3
    let idx = 0
    const results: { blob: Blob; name: string }[] = []

    async function processNext(): Promise<void> {
      while (idx < files.length) {
        const currentIdx = idx++
        const file = files[currentIdx]

        try {
          const canvas = await fileToCanvas(file)
          let processed = canvas

          // 抠图换背景
          if (settings.bgRemoved) {
            const blob = await removeImageBackground(canvas)
            processed = await applyBackgroundColor(blob, bgColor, canvas.width, canvas.height)
          }

          // 裁剪
          processed = autoCrop(processed, template.widthPx, template.heightPx)

          // 调色
          if (settings.brightness !== 0 || settings.contrast !== 0 || settings.saturation !== 0) {
            let imageData = canvasToImageData(processed)
            if (settings.brightness !== 0) imageData = adjustBrightness(imageData, settings.brightness)
            if (settings.contrast !== 0) imageData = adjustContrast(imageData, settings.contrast)
            if (settings.saturation !== 0) imageData = adjustSaturation(imageData, settings.saturation)
            processed = imageDataToCanvas(imageData)
          }

          // 美颜
          if (settings.smoothLevel > 0 || settings.whiteningLevel > 0) {
            let imageData = canvasToImageData(processed)
            if (settings.smoothLevel > 0) imageData = skinSmooth(imageData, settings.smoothLevel)
            if (settings.whiteningLevel > 0) imageData = skinWhitening(imageData, settings.whiteningLevel)
            processed = imageDataToCanvas(imageData)
          }

          const resultBlob = await exportCanvas(processed, "jpg")
          results.push({ blob: resultBlob, name: file.name })
        } catch {
          // 跳过失败文件
        }

        setProgress((p) => p + 1)
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => processNext())
    await Promise.all(workers)

    // 打包下载（逐个下载）
    for (const { blob, name } of results) {
      const baseName = name.replace(/\.[^.]+$/, "")
      downloadBlob(blob, `${baseName}_${settings.selectedSizeId}.jpg`)
    }

    setIsProcessing(false)
  }, [files, settings])

  return (
    <div className="space-y-2">
      <input
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const fileList = e.target.files
          if (fileList) setFiles(Array.from(fileList))
        }}
      />
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        onClick={() => document.getElementById(inputId)?.click()}
        disabled={isProcessing}
      >
        <Upload className="size-3.5" />
        选择多张图片（已选 {files.length} 张）
      </Button>

      {files.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground">
            将使用当前设置（{settings.bgRemoved ? "抠图换背景 + " : ""}{PHOTO_SIZE_TEMPLATES.find((t) => t.id === settings.selectedSizeId)?.name}）批量处理
          </p>

          {isProcessing && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{progress}/{total} 已处理</p>
            </div>
          )}

          <Button
            size="sm"
            className="w-full"
            onClick={handleProcess}
            disabled={isProcessing}
          >
            <Download className="size-3.5" />
            {isProcessing ? "处理中..." : `批量处理并下载 ${files.length} 张`}
          </Button>
        </>
      )}
    </div>
  )
}

function autoCrop(source: HTMLCanvasElement, targetW: number, targetH: number): HTMLCanvasElement {
  const targetRatio = targetW / targetH
  const srcRatio = source.width / source.height
  let cropW: number, cropH: number, cropX: number, cropY: number
  if (srcRatio > targetRatio) {
    cropH = source.height
    cropW = source.height * targetRatio
    cropX = (source.width - cropW) / 2
    cropY = 0
  } else {
    cropW = source.width
    cropH = source.width / targetRatio
    cropX = 0
    cropY = (source.height - cropH) / 2
  }
  const cropped = cropImage(source, { x: Math.round(cropX), y: Math.round(cropY), w: Math.round(cropW), h: Math.round(cropH) })
  return resizeImage(cropped, targetW, targetH)
}
