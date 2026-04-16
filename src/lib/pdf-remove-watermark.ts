import { PDFDocument, StandardFonts } from "pdf-lib"
import * as pdfjsLib from "pdfjs-dist"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

export type RemoveMode = "auto" | "deep"

export interface RemoveResult {
  pdfBytes: Uint8Array
  removedAnnotations: number
  removedStreams: number
  processedPages: number
}

/** Strategy 1: Remove structured watermarks via content stream parsing */
async function removeStructuredWatermarks(pdfBytes: Uint8Array): Promise<{
  pdfDoc: PDFDocument
  removedAnnotations: number
  removedStreams: number
}> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  let removedAnnotations = 0
  let removedStreams = 0
  const pages = pdfDoc.getPages()
  const ctx = pdfDoc.context

  for (const page of pages) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = page.node as any

    // 1. Remove watermark annotations (/Watermark subtype)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotsRef: any = node.get("Annots")
      if (annotsRef) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const annotsArray: any = ctx.lookup(annotsRef)
        if (annotsArray && Array.isArray(annotsArray.asArray?.())) {
          const raw = annotsArray.asArray()
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toKeep: any[] = []
          for (let i = 0; i < raw.length; i++) {
            let isWatermark = false
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const dict: any = ctx.lookup(raw[i])
              const subtype = dict?.get?.("Subtype")?.encodedName ?? dict?.get?.("Subtype")?.toString?.()
              if (subtype === "Watermark" || subtype === "/Watermark") {
                isWatermark = true
                removedAnnotations++
              }
              // Also check for FreeText annotations with watermark-like properties
              const contents = dict?.get?.("Contents")?.decodeText?.() ?? dict?.get?.("Contents")?.toString?.() ?? ""
              if (contents && (subtype === "FreeText" || subtype === "/FreeText")) {
                const rect: any = dict?.get?.("Rect")?.asArray?.()?.map?.((r: any) => parseFloat(r.toString()))
                if (rect && rect.length === 4) {
                  const [x1, y1, x2, y2] = rect
                  const pageW = page.getSize().width
                  const pageH = page.getSize().height
                  // Large text spanning most of the page = likely watermark
                  if ((x2 - x1) > pageW * 0.3 || (y2 - y1) > pageH * 0.3) {
                    isWatermark = true
                    removedAnnotations++
                  }
                }
              }
            } catch { /* skip */ }
            if (!isWatermark) toKeep.push(raw[i])
          }
          if (toKeep.length < raw.length) {
            if (toKeep.length === 0) {
              node.delete("Annots")
            } else {
              node.set("Annots", ctx.obj(toKeep))
            }
          }
        }
      }
    } catch { /* annotations not accessible */ }

    // 2. Remove separate overlay content streams that look like watermarks
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contentsRef: any = node.get("Contents")
      if (contentsRef) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentsObj: any = ctx.lookup(contentsRef)
        if (contentsObj && typeof contentsObj.asArray === "function") {
          const streams = contentsObj.asArray()
          if (streams.length > 1) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const kept: any[] = []
            for (let i = 0; i < streams.length; i++) {
              let isWatermarkStream = false
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const streamObj: any = ctx.lookup(streams[i])
                const content: string = streamObj?.getContentsString?.() ?? ""

                // Watermark patterns in PDF content streams:
                // - Small streams (watermark text is short)
                // - Contains text drawing (BT...ET)
                // - Contains transparency (gs with low opacity, or very light color)
                // - Contains rotation (cm with non-trivial transform)
                const hasText = /BT[\s\S]*?ET/.test(content)
                const hasLowOpacity = /(\d\.\d{1,2})\s+\/(GS|gs)\s/.test(content) ||
                  /\b0\.\d\s+g\b/.test(content)
                // Light gray color: values close to 1.0 in rg/g
                const lightColorMatch = content.match(/([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg/)
                const isLightColor = lightColorMatch
                  ? parseFloat(lightColorMatch[1]) > 0.7 &&
                    parseFloat(lightColorMatch[2]) > 0.7 &&
                    parseFloat(lightColorMatch[3]) > 0.7
                  : false

                if (hasText && (hasLowOpacity || isLightColor) && i > 0) {
                  isWatermarkStream = true
                  removedStreams++
                }
              } catch { /* skip */ }
              if (!isWatermarkStream) kept.push(streams[i])
            }
            if (kept.length < streams.length) {
              node.set("Contents", ctx.obj(kept.length > 0 ? kept : [streams[0]]))
            }
          }
        }
      }
    } catch { /* content streams not accessible */ }
  }

  return { pdfDoc, removedAnnotations, removedStreams }
}

/** Strategy 2: Canvas-based watermark removal - render, process, reconstruct */
async function canvasRemoveWatermark(
  pdfBytes: Uint8Array,
  _threshold: number
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const pageCount = srcDoc.getPageCount()

  const newDoc = await PDFDocument.create()
  await newDoc.embedFont(StandardFonts.Helvetica)

  for (let i = 1; i <= pageCount; i++) {
    // Render page using pdfjs-dist
    const data = new Uint8Array(pdfBytes)
    const pdfJsDoc = await pdfjsLib.getDocument({ data }).promise
    const pdfPage = await pdfJsDoc.getPage(i)
    const scale = 2.0 // High quality rendering
    const viewport = pdfPage.getViewport({ scale })

    const canvas = document.createElement("canvas")
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext("2d")!

    await pdfPage.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx,
      viewport,
    }).promise

    // Process image data to remove watermark pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const { data: pixels } = imageData

    for (let j = 0; j < pixels.length; j += 4) {
      const r = pixels[j]
      const g = pixels[j + 1]
      const b = pixels[j + 2]
      const a = pixels[j + 3]

      // Detect watermark pixels: light colored (near white) with some transparency
      // or solid light gray text
      const brightness = (r + g + b) / 3
      const isLight = brightness > 200
      const isNotWhite = r < 250 || g < 250 || b < 250

      // Check if pixel has transparency (semi-transparent watermark)
      const hasTransparency = a < 255 && a > 0

      // Check if pixel is light gray (solid but light colored watermark)
      const isGray = Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && isLight && isNotWhite

      if ((hasTransparency && isLight) || isGray) {
        // Make watermark pixel white
        pixels[j] = 255
        pixels[j + 1] = 255
        pixels[j + 2] = 255
        pixels[j + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // Convert processed canvas to PNG
    const pngDataUrl = canvas.toDataURL("image/png")
    const pngBase64 = pngDataUrl.split(",")[1]
    const pngBytes = Uint8Array.from(atob(pngBase64), (c) => c.charCodeAt(0))

    // Create page in new PDF with same dimensions
    const origSize = srcDoc.getPage(i - 1).getSize()
    const newPage = newDoc.addPage([origSize.width, origSize.height])

    const pngImage = await newDoc.embedPng(pngBytes)
    newPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: origSize.width,
      height: origSize.height,
    })
  }

  // Copy metadata from source
  newDoc.setTitle(srcDoc.getTitle() ?? "")
  newDoc.setAuthor(srcDoc.getAuthor() ?? "")

  return newDoc.save()
}

export async function removeWatermark(
  pdfBytes: Uint8Array,
  mode: RemoveMode = "auto",
  threshold: number = 200
): Promise<RemoveResult> {
  if (mode === "deep") {
    // Deep clean: canvas-based processing
    const resultBytes = await canvasRemoveWatermark(pdfBytes, threshold)
    const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
    return {
      pdfBytes: resultBytes,
      removedAnnotations: 0,
      removedStreams: 0,
      processedPages: doc.getPageCount(),
    }
  }

  // Auto mode: try structured removal first
  const { pdfDoc, removedAnnotations, removedStreams } = await removeStructuredWatermarks(pdfBytes)
  const pdfResult = await pdfDoc.save()

  return {
    pdfBytes: pdfResult,
    removedAnnotations,
    removedStreams,
    processedPages: pdfDoc.getPageCount(),
  }
}
