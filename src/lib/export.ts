import { toPng, toSvg } from "html-to-image"
import { getNodesBounds, getViewportForBounds } from "@xyflow/react"
import type { Node } from "@xyflow/react"

const IMAGE_PADDING = 50
const IMAGE_WIDTH = 2048
const IMAGE_HEIGHT = 2048

export async function exportDiagram(
  element: HTMLElement,
  nodes: Node[],
  format: "png" | "svg"
): Promise<void> {
  const bounds = getNodesBounds(nodes)
  const viewport = getViewportForBounds(bounds, IMAGE_WIDTH, IMAGE_HEIGHT, 0.5, 2, IMAGE_PADDING)

  const imageWidth = Math.ceil((bounds.width + IMAGE_PADDING * 2) * viewport.zoom)
  const imageHeight = Math.ceil((bounds.height + IMAGE_PADDING * 2) * viewport.zoom)

  const exportFn = format === "png" ? toPng : toSvg
  const dataUrl = await exportFn(element, {
    backgroundColor: "#ffffff",
    filter: (node: HTMLElement) => !node.hasAttribute("data-watermark"),
    width: imageWidth,
    height: imageHeight,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  })

  const a = document.createElement("a")
  a.href = dataUrl
  a.download = `er-diagram.${format}`
  a.click()
}
