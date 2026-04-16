import type { CropArea } from "@/types/id-photo"

/** 裁剪图片 */
export function cropImage(source: HTMLCanvasElement, crop: CropArea): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = crop.w
  canvas.height = crop.h
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h)
  return canvas
}

/** 缩放图片 */
export function resizeImage(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

/** 按比例缩放（最长边不超过 maxPx） */
export function fitImage(source: HTMLCanvasElement, maxPx: number): HTMLCanvasElement {
  const { width, height } = source
  if (width <= maxPx && height <= maxPx) return source
  const ratio = Math.min(maxPx / width, maxPx / height)
  return resizeImage(source, Math.round(width * ratio), Math.round(height * ratio))
}

/** 调整亮度（-100 ~ 100） */
export function adjustBrightness(imageData: ImageData, value: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const offset = value * 2.55
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] + offset
    data[i + 1] = data[i + 1] + offset
    data[i + 2] = data[i + 2] + offset
  }
  return new ImageData(data, imageData.width, imageData.height)
}

/** 调整对比度（-100 ~ 100） */
export function adjustContrast(imageData: ImageData, value: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const factor = (259 * (value + 255)) / (255 * (259 - value))
  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128
    data[i + 1] = factor * (data[i + 1] - 128) + 128
    data[i + 2] = factor * (data[i + 2] - 128) + 128
  }
  return new ImageData(data, imageData.width, imageData.height)
}

/** 调整饱和度（-100 ~ 100） */
export function adjustSaturation(imageData: ImageData, value: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data)
  const factor = 1 + value / 100
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    data[i] = gray + factor * (data[i] - gray)
    data[i + 1] = gray + factor * (data[i + 1] - gray)
    data[i + 2] = gray + factor * (data[i + 2] - gray)
  }
  return new ImageData(data, imageData.width, imageData.height)
}

/** 将 ImageData 绘制到新 Canvas */
export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = imageData.width
  canvas.height = imageData.height
  canvas.getContext("2d")!.putImageData(imageData, 0, 0)
  return canvas
}

/** 从 Canvas 获取 ImageData */
export function canvasToImageData(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height)
}

/** 格式转换导出 */
export async function exportCanvas(
  canvas: HTMLCanvasElement,
  format: "jpg" | "png",
  quality: number = 0.92,
): Promise<Blob> {
  const mimeType = format === "jpg" ? "image/jpeg" : "image/png"
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("导出失败"))),
      mimeType,
      format === "jpg" ? quality : undefined,
    )
  })
}

/** 下载 Blob 文件 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

/** 加载图片文件为 HTMLImageElement */
export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** 将文件绘制到 Canvas */
export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  const img = await loadImageElement(url)
  URL.revokeObjectURL(url)
  const canvas = document.createElement("canvas")
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  canvas.getContext("2d")!.drawImage(img, 0, 0)
  return canvas
}
