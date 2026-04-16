import type { PhotoSizeTemplate, BgColorOption } from "@/types/id-photo"

/** 常见证件照尺寸模板（300dpi） */
export const PHOTO_SIZE_TEMPLATES: PhotoSizeTemplate[] = [
  { id: "one-inch", name: "一寸", widthPx: 295, heightPx: 413, widthMm: 25, heightMm: 35, dpi: 300 },
  { id: "two-inch", name: "二寸", widthPx: 413, heightPx: 579, widthMm: 35, heightMm: 49, dpi: 300 },
  { id: "small-two-inch", name: "小二寸", widthPx: 390, heightPx: 567, widthMm: 33, heightMm: 48, dpi: 300 },
  { id: "passport", name: "护照/签证", widthPx: 390, heightPx: 567, widthMm: 33, heightMm: 48, dpi: 300 },
  { id: "visa-us", name: "美国签证", widthPx: 600, heightPx: 600, widthMm: 51, heightMm: 51, dpi: 300 },
  { id: "id-card", name: "身份证", widthPx: 358, heightPx: 441, widthMm: 26, heightMm: 32, dpi: 350 },
  { id: "driver-license", name: "驾驶证", widthPx: 260, heightPx: 378, widthMm: 22, heightMm: 32, dpi: 300 },
  { id: "graduation", name: "毕业证", widthPx: 480, heightPx: 640, widthMm: 40, heightMm: 53, dpi: 300 },
  { id: "resume", name: "简历照", widthPx: 295, heightPx: 413, widthMm: 25, heightMm: 35, dpi: 300 },
]

/** 背景色预设 */
export const BG_COLOR_PRESETS: BgColorOption[] = [
  { id: "blue", name: "蓝底", color: "#438edb" },
  { id: "red", name: "红底", color: "#d32b2b" },
  { id: "white", name: "白底", color: "#ffffff" },
  { id: "gradient-blue", name: "渐变蓝", color: "linear-gradient(180deg, #6fb1fc 0%, #438edb 100%)" },
  { id: "blur", name: "模糊底", color: "blur" },
]

/** 纸张尺寸（毫米） */
export const PAPER_SIZES = {
  A4: { widthMm: 210, heightMm: 297 },
  "5R": { widthMm: 127, heightMm: 178 },
} as const
