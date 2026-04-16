import type { FaceDetectionResult } from "@/types/id-photo"

interface FaceGuideOverlayProps {
  face: FaceDetectionResult | null
  canvasWidth: number
  canvasHeight: number
  displayScale: number
}

export function FaceGuideOverlay({ face, canvasWidth, canvasHeight, displayScale }: FaceGuideOverlayProps) {
  if (!face) return null

  const s = displayScale
  const faceRect = {
    x: face.x * s,
    y: face.y * s,
    w: face.width * s,
    h: face.height * s,
  }

  // 中心十字线
  const cx = canvasWidth * s / 2
  const cy = canvasHeight * s / 2

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={canvasWidth * s}
      height={canvasHeight * s}
    >
      {/* 中心垂直线 */}
      <line x1={cx} y1={0} x2={cx} y2={canvasHeight * s} stroke="#4ade80" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
      {/* 中心水平线 */}
      <line x1={0} y1={cy} x2={canvasWidth * s} y2={cy} stroke="#4ade80" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
      {/* 人脸框 */}
      <rect
        x={faceRect.x}
        y={faceRect.y}
        width={faceRect.w}
        height={faceRect.h}
        fill="none"
        stroke="#4ade80"
        strokeWidth={2}
        strokeDasharray="6 3"
        rx={4}
        opacity={0.8}
      />
      {/* 头顶 1/10 线 */}
      <line x1={0} y1={canvasHeight * s * 0.1} x2={canvasWidth * s} y2={canvasHeight * s * 0.1} stroke="#facc15" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
      {/* 下巴 7/10 线 */}
      <line x1={0} y1={canvasHeight * s * 0.7} x2={canvasWidth * s} y2={canvasHeight * s * 0.7} stroke="#facc15" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
    </svg>
  )
}
