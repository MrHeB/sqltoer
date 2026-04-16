/** 证件照尺寸模板 */
export interface PhotoSizeTemplate {
  id: string
  name: string
  widthPx: number
  heightPx: number
  widthMm: number
  heightMm: number
  dpi: number
}

/** 背景色预设 */
export type BgColorPreset = "blue" | "red" | "white" | "gradient-blue" | "custom"

export interface BgColorOption {
  id: BgColorPreset
  name: string
  color: string
}

/** 人脸检测结果 */
export interface FaceDetectionResult {
  x: number
  y: number
  width: number
  height: number
  landmarks: { x: number; y: number }[]
  confidence: number
}

/** 合规检测结果 */
export interface ComplianceCheckResult {
  rule: string
  passed: boolean
  message: string
  severity: "error" | "warning" | "info"
}

/** 裁剪区域 */
export interface CropArea {
  x: number
  y: number
  w: number
  h: number
}

/** 证件照处理状态 */
export interface IdPhotoState {
  sourceImage: HTMLImageElement | null
  sourceFileName: string
  processedCanvas: HTMLCanvasElement | null
  isProcessing: boolean
  processingMessage: string
  // 背景
  bgRemoved: boolean
  selectedBgColor: BgColorPreset
  customBgColor: string
  transparentBlob: Blob | null
  // 尺寸/裁剪
  selectedSizeId: string
  cropArea: CropArea | null
  // 调色
  brightness: number
  contrast: number
  saturation: number
  // 美颜
  smoothLevel: number
  whiteningLevel: number
  // 人脸检测
  faceDetection: FaceDetectionResult | null
  complianceResults: ComplianceCheckResult[]
  // 批量
  batchFiles: File[]
  batchProgress: number
}

/** 排版打印配置 */
export interface PrintLayoutConfig {
  paperSize: "A4" | "5R"
  gapMm: number
}
