import { useEffect, useRef, useState, useCallback } from "react"
import * as pdfjsLib from "pdfjs-dist"

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString()

interface UsePdfPreviewReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  currentPage: number
  totalPages: number
  goToPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  isLoading: boolean
}

export function usePdfPreview(data: Uint8Array | null): UsePdfPreviewReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null)

  useEffect(() => {
    if (!data) {
      pdfDocRef.current = null
      setTotalPages(0)
      setCurrentPage(1)
      return
    }

    const task = pdfjsLib.getDocument({ data: data.slice() })
    task.promise.then((pdf) => {
      pdfDocRef.current = pdf
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
    })
  }, [data])

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current
    const canvas = canvasRef.current
    if (!pdf || !canvas || pageNum < 1 || pageNum > pdf.numPages) return

    setIsLoading(true)
    try {
      const page = await pdf.getPage(pageNum)
      const scale = 1.5
      const viewport = page.getViewport({ scale })
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx, viewport }).promise
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (totalPages > 0) renderPage(currentPage)
  }, [currentPage, totalPages, renderPage])

  const goToPage = useCallback((p: number) => {
    setCurrentPage(p)
  }, [])

  const nextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages))
  }, [totalPages])

  const prevPage = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 1))
  }, [])

  return { canvasRef, currentPage, totalPages, goToPage, nextPage, prevPage, isLoading }
}
