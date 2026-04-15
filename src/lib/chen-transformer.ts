import dagre from "@dagrejs/dagre"
import type { Node, Edge } from "@xyflow/react"
import type { ParsedSchema } from "@/types"

const ENTITY_W = 120
const ENTITY_H = 50
const ATTR_W = 80
const ATTR_H = 36
const REL_SIZE = 70
const ATTR_RADIUS = 110

type Dir = "top" | "right" | "bottom" | "left"

function getDirection(fromX: number, fromY: number, toX: number, toY: number): Dir {
  const dx = toX - fromX
  const dy = toY - fromY
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left"
  return dy > 0 ? "bottom" : "top"
}

export function schemaToChenElements(
  schema: ParsedSchema,
  fontSize: number,
  cardWidth: number,
  attrSize: number,
  borderWidth: number
): { nodes: Node[]; edges: Edge[] } {
  const tableNameSet = new Set(schema.tables.map((t) => t.name))
  const validRelations = schema.relations.filter(
    (r) => tableNameSet.has(r.sourceTable) && tableNameSet.has(r.targetTable)
  )

  // Step 1: Dagre layout for entities
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: "LR", nodesep: 300, ranksep: 350 })
  g.setDefaultEdgeLabel(() => ({}))

  for (const table of schema.tables) {
    g.setNode(table.name, { width: cardWidth || ENTITY_W, height: ENTITY_H })
  }
  for (const rel of validRelations) {
    g.setEdge(rel.sourceTable, rel.targetTable)
  }
  dagre.layout(g)

  // Step 2: Entity nodes
  const nodes: Node[] = []
  const edges: Edge[] = []
  const entityCenters = new Map<string, { x: number; y: number }>()

  for (const table of schema.tables) {
    const dn = g.node(table.name)
    if (!dn) continue
    const cx = dn.x
    const cy = dn.y
    const ew = cardWidth || ENTITY_W
    entityCenters.set(table.name, { x: cx, y: cy })

    nodes.push({
      id: `chen-e-${table.name}`,
      type: "chenEntity",
      position: { x: cx - ew / 2, y: cy - ENTITY_H / 2 },
      data: { tableName: table.name, fontSize, cardWidth: ew, borderWidth },
    })
  }

  // Step 3: Relationship nodes at midpoint between entities
  for (const rel of validRelations) {
    const sc = entityCenters.get(rel.sourceTable)
    const tc = entityCenters.get(rel.targetTable)
    if (!sc || !tc) continue

    const midX = (sc.x + tc.x) / 2
    const midY = (sc.y + tc.y) / 2

    nodes.push({
      id: `chen-r-${rel.id}`,
      type: "chenRelationship",
      position: { x: midX - REL_SIZE / 2, y: midY - REL_SIZE / 2 },
      data: { label: rel.type, fontSize, borderWidth },
    })

    // Source entity → relationship
    const sDir = getDirection(sc.x, sc.y, midX, midY)
    edges.push({
      id: `chen-re-${rel.id}-s`,
      source: `chen-e-${rel.sourceTable}`,
      target: `chen-r-${rel.id}`,
      sourceHandle: `source-${sDir}`,
      targetHandle: `target-${sDir === "right" ? "left" : sDir === "left" ? "right" : sDir === "top" ? "bottom" : "top"}`,
      type: "straight",
      style: { strokeWidth: borderWidth },
    })

    // Relationship → target entity
    const tDir = getDirection(midX, midY, tc.x, tc.y)
    edges.push({
      id: `chen-re-${rel.id}-t`,
      source: `chen-r-${rel.id}`,
      target: `chen-e-${rel.targetTable}`,
      sourceHandle: `source-${tDir}`,
      targetHandle: `target-${tDir === "right" ? "left" : tDir === "left" ? "right" : tDir === "top" ? "bottom" : "top"}`,
      type: "straight",
      style: { strokeWidth: borderWidth },
    })
  }

  // Step 4: Attribute nodes around entities (upper semicircle)
  for (const table of schema.tables) {
    const center = entityCenters.get(table.name)
    if (!center || table.columns.length === 0) continue

    const n = table.columns.length
    const angleSpan = Math.min(Math.PI * 0.85, Math.PI * 0.25 * n)
    const startAngle = -Math.PI / 2 - angleSpan / 2
    const step = n > 1 ? angleSpan / (n - 1) : 0

    for (let i = 0; i < n; i++) {
      const angle = n === 1 ? -Math.PI / 2 : startAngle + step * i
      const col = table.columns[i]

      const ax = center.x + ATTR_RADIUS * Math.cos(angle) - ATTR_W / 2
      const ay = center.y + ATTR_RADIUS * Math.sin(angle) - ATTR_H / 2

      nodes.push({
        id: `chen-a-${table.name}-${col.name}`,
        type: "chenAttribute",
        position: { x: ax, y: ay },
        data: { name: col.name, isPK: col.isPrimaryKey, fontSize, attrSize, borderWidth },
      })

      const attrCenter = { x: ax + ATTR_W / 2, y: ay + ATTR_H / 2 }
      const dir = getDirection(attrCenter.x, attrCenter.y, center.x, center.y)
      const oppDir: Dir = dir === "top" ? "bottom" : dir === "bottom" ? "top" : dir === "left" ? "right" : "left"

      edges.push({
        id: `chen-ae-${table.name}-${col.name}`,
        source: `chen-a-${table.name}-${col.name}`,
        target: `chen-e-${table.name}`,
        sourceHandle: `source-${dir}`,
        targetHandle: `target-${oppDir}`,
        type: "straight",
        style: { strokeWidth: borderWidth },
      })
    }
  }

  return { nodes, edges }
}
