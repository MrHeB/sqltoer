import type { Node, Edge } from "@xyflow/react"
import type { ParsedSchema, TableNodeData } from "@/types"
import { applyAutoLayout } from "@/lib/auto-layout"

const DEFAULT_FONT_SIZE = 13
const DEFAULT_CARD_WIDTH = 250

export function schemaToElements(
  schema: ParsedSchema,
  fontSize: number = DEFAULT_FONT_SIZE,
  cardWidth: number = DEFAULT_CARD_WIDTH
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = schema.tables.map((table) => ({
    id: table.name,
    type: "tableNode",
    position: { x: 0, y: 0 },
    data: {
      tableName: table.name,
      columns: table.columns,
      fontSize,
      cardWidth,
    } satisfies TableNodeData,
  }))

  const edges: Edge[] = schema.relations.map((rel) => ({
    id: rel.id,
    source: rel.sourceTable,
    target: rel.targetTable,
    sourceHandle: `source-${rel.sourceColumn}`,
    targetHandle: `target-${rel.targetColumn}`,
    type: "relationEdge",
    data: { label: rel.type, sourceColumn: rel.sourceColumn, targetColumn: rel.targetColumn },
  }))

  const laidNodes = applyAutoLayout(nodes, edges)
  return { nodes: laidNodes, edges }
}
