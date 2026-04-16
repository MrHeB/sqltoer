import { useRef, useEffect } from "react"

interface PhotoPreviewProps {
  canvas: HTMLCanvasElement | null
}

export function PhotoPreview({ canvas }: PhotoPreviewProps) {
  const displayRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvas || !displayRef.current) return
    const ctx = displayRef.current.getContext("2d")!
    const maxW = 600
    const maxH = 700
    const scale = Math.min(maxW / canvas.width, maxH / canvas.height, 1)
    const w = Math.round(canvas.width * scale)
    const h = Math.round(canvas.height * scale)
    displayRef.current.width = w
    displayRef.current.height = h
    ctx.drawImage(canvas, 0, 0, w, h)
  }, [canvas])

  if (!canvas) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">上传照片后在此预览</p>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <canvas ref={displayRef} className="rounded-lg shadow-lg" />
    </div>
  )
}
