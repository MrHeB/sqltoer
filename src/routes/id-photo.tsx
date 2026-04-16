import { useCallback, useState, useEffect, useRef } from "react"
import { useIdPhoto } from "@/hooks/useIdPhoto"
import { PhotoUpload } from "@/components/id-photo/PhotoUpload"
import { PhotoPreview } from "@/components/id-photo/PhotoPreview"
import { CropSection } from "@/components/id-photo/CropSection"
import { BackgroundSection } from "@/components/id-photo/BackgroundSection"
import { FaceGuideOverlay } from "@/components/id-photo/FaceGuideOverlay"
import { CompliancePanel } from "@/components/id-photo/CompliancePanel"
import { PrintLayoutPanel } from "@/components/id-photo/PrintLayoutPanel"
import { BatchPanel } from "@/components/id-photo/BatchPanel"
import { exportCanvas, downloadBlob } from "@/lib/id-photo/image-operations"
import { Button } from "@/components/ui/button"
import { Download, ScanFace } from "lucide-react"

export function IdPhotoPage() {
  const { state, loadImage, removeBg, setBgColor, setPhotoSize, debouncedAdjust, debouncedBeauty, runFaceDetection } = useIdPhoto()
  const [displayScale, setDisplayScale] = useState(1)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)

  const handleExport = useCallback(
    async (format: "jpg" | "png") => {
      if (!state.processedCanvas) return
      const blob = await exportCanvas(state.processedCanvas, format)
      const baseName = state.sourceFileName.replace(/\.[^.]+$/, "")
      downloadBlob(blob, `${baseName}_${state.selectedSizeId}.${format}`)
    },
    [state.processedCanvas, state.sourceFileName, state.selectedSizeId],
  )

  // 计算 canvas 显示缩放
  useEffect(() => {
    if (!state.processedCanvas || !canvasWrapperRef.current) {
      setDisplayScale(1)
      return
    }
    const wrapper = canvasWrapperRef.current
    const maxW = wrapper.clientWidth - 48
    const maxH = wrapper.clientHeight - 48
    const scale = Math.min(maxW / state.processedCanvas.width, maxH / state.processedCanvas.height, 1)
    setDisplayScale(scale)
  }, [state.processedCanvas])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">证件照处理</h1>
          <p className="text-xs text-muted-foreground">智能抠图、标准尺寸、排版打印</p>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <PhotoUpload fileName={state.sourceFileName} onFileSelect={loadImage} />

          {state.sourceImage && (
            <>
              <details open>
                <summary className="cursor-pointer text-xs font-medium">背景替换</summary>
                <div className="mt-2">
                  <BackgroundSection
                    selectedBgColor={state.selectedBgColor}
                    customBgColor={state.customBgColor}
                    bgRemoved={state.bgRemoved}
                    isProcessing={state.isProcessing}
                    onRemoveBg={removeBg}
                    onSelectColor={setBgColor}
                  />
                </div>
              </details>

              <details open>
                <summary className="cursor-pointer text-xs font-medium">尺寸裁剪</summary>
                <div className="mt-2">
                  <CropSection selectedSizeId={state.selectedSizeId} onSelectSize={setPhotoSize} />
                </div>
              </details>

              <details open>
                <summary className="cursor-pointer text-xs font-medium">调色</summary>
                <div className="mt-2 space-y-2">
                  <AdjustSlider label="亮度" value={state.brightness} onChange={(v) => debouncedAdjust(v, state.contrast, state.saturation)} />
                  <AdjustSlider label="对比度" value={state.contrast} onChange={(v) => debouncedAdjust(state.brightness, v, state.saturation)} />
                  <AdjustSlider label="饱和度" value={state.saturation} onChange={(v) => debouncedAdjust(state.brightness, state.contrast, v)} />
                </div>
              </details>

              <details>
                <summary className="cursor-pointer text-xs font-medium">美颜</summary>
                <div className="mt-2 space-y-2">
                  <AdjustSlider label="磨皮" value={state.smoothLevel} min={0} onChange={(v) => debouncedBeauty(v, state.whiteningLevel)} />
                  <AdjustSlider label="美白" value={state.whiteningLevel} min={0} onChange={(v) => debouncedBeauty(state.smoothLevel, v)} />
                </div>
              </details>

              <details>
                <summary className="cursor-pointer text-xs font-medium">人脸检测 & 合规</summary>
                <div className="mt-2 space-y-2">
                  <Button size="sm" variant="outline" className="w-full" onClick={runFaceDetection} disabled={state.isProcessing}>
                    <ScanFace className="size-3.5" /> 检测人脸并验证
                  </Button>
                  <CompliancePanel results={state.complianceResults} />
                </div>
              </details>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleExport("jpg")}>
                    <Download className="size-3.5" /> 导出 JPG
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleExport("png")}>
                    <Download className="size-3.5" /> 导出 PNG
                  </Button>
                </div>
              </div>

              <details>
                <summary className="cursor-pointer text-xs font-medium">排版打印</summary>
                <div className="mt-2">
                  <PrintLayoutPanel
                    processedCanvas={state.processedCanvas}
                    selectedSizeId={state.selectedSizeId}
                  />
                </div>
              </details>

              <details>
                <summary className="cursor-pointer text-xs font-medium">批量处理</summary>
                <div className="mt-2">
                  <BatchPanel settings={state} />
                </div>
              </details>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 bg-muted/30 overflow-auto" ref={canvasWrapperRef}>
        {state.isProcessing ? (
          <div className="flex h-full flex-col items-center justify-center gap-2">
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">{state.processingMessage}</p>
          </div>
        ) : (
          <div className="relative flex h-full items-center justify-center p-6">
            <PhotoPreview canvas={state.processedCanvas} />
            {state.faceDetection && state.processedCanvas && (
              <FaceGuideOverlay
                face={state.faceDetection}
                canvasWidth={state.processedCanvas.width}
                canvasHeight={state.processedCanvas.height}
                displayScale={displayScale}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function AdjustSlider({
  label,
  value,
  min = -100,
  onChange,
}: {
  label: string
  value: number
  min?: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-xs text-muted-foreground">
        {label}: {value}
      </label>
      <input
        type="range"
        min={min}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}
