import { PDFDocument } from "pdf-lib"
import { PAPER_SIZES } from "./standards"

export interface GridLayout {
  cols: number
  rows: number
  positions: { x: number; y: number }[]
}

/** 计算排版网格 */
export function calculateGridLayout(
  photoWidthMm: number,
  photoHeightMm: number,
  paperKey: keyof typeof PAPER_SIZES,
  gapMm: number = 3,
): GridLayout {
  const paper = PAPER_SIZES[paperKey]
  const cols = Math.floor((paper.widthMm + gapMm) / (photoWidthMm + gapMm))
  const rows = Math.floor((paper.heightMm + gapMm) / (photoHeightMm + gapMm))

  // 居中偏移
  const usedW = cols * photoWidthMm + (cols - 1) * gapMm
  const usedH = rows * photoHeightMm + (rows - 1) * gapMm
  const offsetX = (paper.widthMm - usedW) / 2
  const offsetY = (paper.heightMm - usedH) / 2

  const positions: GridLayout["positions"] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions.push({
        x: offsetX + c * (photoWidthMm + gapMm),
        y: offsetY + r * (photoHeightMm + gapMm),
      })
    }
  }

  return { cols, rows, positions }
}

/** mm 转 PDF 点 (1pt = 1/72 inch, 1 inch = 25.4mm) */
function mmToPt(mm: number): number {
  return (mm / 25.4) * 72
}

/** 生成排版 PDF */
export async function generatePrintPdf(
  photoBlob: Blob,
  photoWidthMm: number,
  photoHeightMm: number,
  paperKey: keyof typeof PAPER_SIZES,
  gapMm: number = 3,
  customCols?: number | null,
  customRows?: number | null,
): Promise<Uint8Array> {
  const paper = PAPER_SIZES[paperKey]
  let layout: GridLayout

  if (customCols && customRows) {
    const usedW = customCols * photoWidthMm + (customCols - 1) * gapMm
    const usedH = customRows * photoHeightMm + (customRows - 1) * gapMm
    const offsetX = (paper.widthMm - usedW) / 2
    const offsetY = (paper.heightMm - usedH) / 2
    const positions: GridLayout["positions"] = []
    for (let r = 0; r < customRows; r++) {
      for (let c = 0; c < customCols; c++) {
        positions.push({
          x: offsetX + c * (photoWidthMm + gapMm),
          y: offsetY + r * (photoHeightMm + gapMm),
        })
      }
    }
    layout = { cols: customCols, rows: customRows, positions }
  } else {
    layout = calculateGridLayout(photoWidthMm, photoHeightMm, paperKey, gapMm)
  }

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([mmToPt(paper.widthMm), mmToPt(paper.heightMm)])

  const photoBytes = await photoBlob.arrayBuffer()
  const embeddedImage = await pdfDoc.embedPng(photoBytes)

  const photoWtPt = mmToPt(photoWidthMm)
  const photoHtPt = mmToPt(photoHeightMm)
  const paperHtPt = mmToPt(paper.heightMm)

  for (const pos of layout.positions) {
    const x = mmToPt(pos.x)
    // PDF 坐标从左下角开始，需要翻转 Y
    const y = paperHtPt - mmToPt(pos.y) - photoHtPt
    page.drawImage(embeddedImage, {
      x,
      y,
      width: photoWtPt,
      height: photoHtPt,
    })
  }

  return pdfDoc.save()
}
