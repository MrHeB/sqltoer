import { loadImageElement } from "./image-operations"

let removalModule: typeof import("@imgly/background-removal") | null = null

async function getRemovalModule() {
  if (!removalModule) {
    removalModule = await import("@imgly/background-removal")
  }
  return removalModule
}

/** 去除图片背景，返回透明 PNG Blob */
export async function removeImageBackground(
  source: HTMLCanvasElement | HTMLImageElement | Blob | string,
): Promise<Blob> {
  const { removeBackground } = await getRemovalModule()

  let input: Blob | string
  if (source instanceof HTMLCanvasElement) {
    input = await new Promise<Blob>((resolve, reject) => {
      source.toBlob(
        (blob) => (blob ? resolve(blob!) : reject(new Error("Canvas 转 Blob 失败"))),
        "image/png",
      )
    })
  } else if (source instanceof HTMLImageElement) {
    const canvas = document.createElement("canvas")
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight
    canvas.getContext("2d")!.drawImage(source, 0, 0)
    input = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob!) : reject(new Error("Canvas 转 Blob 失败"))),
        "image/png",
      )
    })
  } else {
    input = source
  }

  return removeBackground(input, {
    model: "isnet_fp16",
    output: { format: "image/png" },
  })
}

/** 将透明图片合成到指定背景色上 */
export async function applyBackgroundColor(
  transparentBlob: Blob,
  color: string,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(transparentBlob)
  const img = await loadImageElement(url)
  URL.revokeObjectURL(url)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!

  // 填充背景色
  if (color.startsWith("linear-gradient")) {
    const match = color.match(/#[0-9a-fA-F]{6}/g)
    if (match && match.length >= 2) {
      const gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, match[0])
      gradient.addColorStop(1, match[1])
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = "#438edb"
    }
  } else {
    ctx.fillStyle = color
  }
  ctx.fillRect(0, 0, width, height)

  // 绘制透明图片
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

/** 将透明图合成到模糊背景上 */
export async function applyBlurBackground(
  sourceCanvas: HTMLCanvasElement,
  transparentBlob: Blob,
  blurLevel: number,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(transparentBlob)
  const img = await loadImageElement(url)
  URL.revokeObjectURL(url)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")!

  // 绘制原背景并模糊
  ctx.filter = `blur(${blurLevel}px)`
  ctx.drawImage(sourceCanvas, 0, 0, width, height)
  ctx.filter = "none"

  // 叠加前景人物
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}
