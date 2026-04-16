import { PDFDocument } from "pdf-lib"

export interface RemoveResult {
  pdfBytes: Uint8Array
  removedAnnotations: number
  removedOverlays: number
}

export async function removeWatermark(pdfBytes: Uint8Array): Promise<RemoveResult> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  let removedAnnotations = 0
  let removedOverlays = 0

  const pages = pdfDoc.getPages()
  const ctx = pdfDoc.context

  for (const page of pages) {
    // Cast to any to access pdf-lib internal node API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = page.node as any

    // 1. Remove watermark annotations
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annots: any = node.lookup("Annots")
      if (annots && Array.isArray(annots.asArray?.())) {
        const raw = annots.asArray()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toKeep: any[] = []
        for (let i = 0; i < raw.length; i++) {
          let isWatermark = false
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dict: any = ctx.lookup(raw[i])
            const subtype = dict?.get?.("Subtype")?.toString?.()
            if (subtype === "/Watermark") {
              isWatermark = true
              removedAnnotations++
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
    } catch { /* annotations not accessible */ }

    // 2. Remove overlay content streams (watermarks as last content layer)
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
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const streamObj: any = ctx.lookup(streams[i])
                const content: string = streamObj?.getContentsString?.() ?? ""
                // Detect watermark-like: small stream with text + matrix + color operators
                const isWatermarkStream = content.length < 1000 &&
                  /BT/i.test(content) &&
                  /Tm/i.test(content) &&
                  /rg/i.test(content)
                if (isWatermarkStream && i > 0) {
                  removedOverlays++
                  continue
                }
              } catch { /* skip */ }
              kept.push(streams[i])
            }
            if (kept.length < streams.length) {
              node.set("Contents", ctx.obj(kept.length > 0 ? kept : [streams[0]]))
            }
          }
        }
      }
    } catch { /* content streams not accessible */ }
  }

  return {
    pdfBytes: await pdfDoc.save(),
    removedAnnotations,
    removedOverlays,
  }
}
