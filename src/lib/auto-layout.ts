import dagre from "@dagrejs/dagre"
import type { Node, Edge } from "@xyflow/react"

const NODE_HEIGHT = 50
const NODE_WIDTH = 250

export function applyAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 })

  for (const node of nodes) {
    const data = node.data as Record<string, unknown> | undefined
    const width = typeof data?.cardWidth === "number" ? data.cardWidth : NODE_WIDTH
    const columns = Array.isArray(data?.columns) ? data.columns : []
    dagreGraph.setNode(node.id, { width, height: NODE_HEIGHT * (columns.length + 1) })
  }

  for (const edge of edges) {
    dagreGraph.setEdge(edge.source, edge.target)
  }

  dagre.layout(dagreGraph)

  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id)
    return {
      ...node,
      position: { x: dagreNode.x - dagreNode.width / 2, y: dagreNode.y - dagreNode.height / 2 },
    }
  })
}
