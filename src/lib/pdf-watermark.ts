import { PDFDocument, degrees } from "pdf-lib"

export interface WatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: string
  mode: "center" | "tile"
}

function renderTextToCanvas(text: string, fontSize: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  const font = `${fontSize}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`
  ctx.font = font
  const textWidth = ctx.measureText(text).width
  const textHeight = fontSize * 1.4

  canvas.width = Math.ceil(textWidth) + 20
  canvas.height = Math.ceil(textHeight) + 20

  ctx.font = font
  ctx.fillStyle = color
  ctx.textBaseline = "middle"
  ctx.fillText(text, 10, canvas.height / 2)
  return canvas
}

export async function addWatermark(
  pdfBytes: Uint8Array,
  options: WatermarkOptions
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const { text, fontSize, opacity, rotation, mode } = options

  const canvas = renderTextToCanvas(text, fontSize, options.color)
  const pngDataUrl = canvas.toDataURL("image/png")
  const pngBase64 = pngDataUrl.split(",")[1]
  const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0))

  const pngImage = await pdfDoc.embedPng(pngBytes)
  const imgW = canvas.width * 0.75
  const imgH = canvas.height * 0.75

  for (const page of pdfDoc.getPages()) {
    const { width, height } = page.getSize()

    if (mode === "center") {
      page.drawImage(pngImage, {
        x: (width - imgW) / 2,
        y: (height - imgH) / 2,
        width: imgW,
        height: imgH,
        opacity,
        rotate: degrees(rotation),
      })
    } else {
      const gapX = imgW + 80
      const gapY = imgH + 120
      const diag = Math.sqrt(width * width + height * height)
      const offsetX = -(diag - width) / 2
      const offsetY = -(diag - height) / 2

      for (let y = offsetY; y < diag; y += gapY) {
        for (let x = offsetX; x < diag; x += gapX) {
          page.drawImage(pngImage, {
            x,
            y: height - y - imgH,
            width: imgW,
            height: imgH,
            opacity,
            rotate: degrees(rotation),
          })
        }
      }
    }
  }

  return pdfDoc.save()
}
