import { useState, useCallback, useMemo } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from "@xyflow/react"
import type { Node, Edge, NodeProps, EdgeProps, Connection } from "@xyflow/react"
import { useNodesState, useEdgesState, addEdge } from "@xyflow/react"
import dagre from "@dagrejs/dagre"
import "@xyflow/react/dist/style.css"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Plus, Trash2, LayoutGrid, FileCode2, Pencil, Check, X, ArrowRight,
} from "lucide-react"

/* ========== Types ========== */
interface ColumnDef {
  id: string
  name: string
  type: string
  isPK: boolean
  isFK: boolean
}

interface TableNodeData {
  label: string
  tableName: string
  columns: ColumnDef[]
}

type RelationType = "1:1" | "1:N" | "M:N"

interface RelationEdgeData {
  relationType: RelationType
}

/* ========== Helpers ========== */
function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

const SQL_TYPES = [
  "INT", "BIGINT", "SMALLINT", "VARCHAR(255)", "CHAR(50)",
  "TEXT", "BOOLEAN", "DATE", "TIMESTAMP", "DECIMAL(10,2)",
  "FLOAT", "DOUBLE", "BLOB", "JSON",
]

function encodeHandleId(role: "source" | "target", colName: string, side: "left" | "right"): string {
  return `${role}::${colName}::${side}`
}

function decodeHandleId(handleId: string): { role: string; colName: string; side: string } | null {
  const parts = handleId.split("::")
  if (parts.length === 3) return { role: parts[0], colName: parts[1], side: parts[2] }
  // Legacy fallback: "source-colName-left" / "target-colName-right"
  const legacy = handleId.match(/^(source|target)-(.+)-(left|right)$/)
  if (legacy) return { role: legacy[1], colName: legacy[2], side: legacy[3] }
  return null
}

function getFkRefForColumn(tableId: string, colName: string, edges: Edge[]): { refTableId: string; refColName: string } | null {
  const sourceHandle = encodeHandleId("source", colName, "left")
  const edge = edges.find(e => e.source === tableId && e.sourceHandle === sourceHandle)
  if (!edge) return null
  const targetDecoded = decodeHandleId(edge.targetHandle ?? "")
  if (!targetDecoded) return null
  return { refTableId: edge.target, refColName: targetDecoded.colName }
}

function generateDDL(tables: Node[], edges: Edge[]): string {
  const lines: string[] = []

  for (const node of tables) {
    const data = node.data as unknown as TableNodeData
    if (!data.columns || data.columns.length === 0) continue

    const colDefs = data.columns.map((col) => {
      let def = `  "${col.name}" ${col.type}`
      if (col.isPK) def += " NOT NULL"
      return def
    })

    const pkCols = data.columns.filter((c) => c.isPK).map((c) => `"${c.name}"`)
    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.join(", ")})`)
    }

    lines.push(`CREATE TABLE "${data.tableName}" (\n${colDefs.join(",\n")}\n);`)
  }

  // Foreign key constraints from edges
  for (const edge of edges) {
    const sourceTable = tables.find((n) => n.id === edge.source)
    const targetTable = tables.find((n) => n.id === edge.target)
    if (!sourceTable || !targetTable) continue

    const sourceData = sourceTable.data as unknown as TableNodeData
    const targetData = targetTable.data as unknown as TableNodeData

    const sourceDecoded = decodeHandleId(edge.sourceHandle ?? "")
    const targetDecoded = decodeHandleId(edge.targetHandle ?? "")
    if (!sourceDecoded || !targetDecoded) continue

    const sourceColName = sourceDecoded.colName
    const targetColName = targetDecoded.colName
    const relType = (edge.data as unknown as RelationEdgeData)?.relationType ?? "1:N"

    if (relType === "M:N") {
      const junctionTableName = `${sourceData.tableName}_${targetData.tableName}`
      lines.push(
        `CREATE TABLE "${junctionTableName}" (\n` +
        `  "${sourceData.tableName}_id" INT NOT NULL,\n` +
        `  "${targetData.tableName}_id" INT NOT NULL,\n` +
        `  PRIMARY KEY ("${sourceData.tableName}_id", "${targetData.tableName}_id"),\n` +
        `  CONSTRAINT "fk_${junctionTableName}_${sourceData.tableName}" FOREIGN KEY ("${sourceData.tableName}_id") REFERENCES "${sourceData.tableName}"("${sourceColName}"),\n` +
        `  CONSTRAINT "fk_${junctionTableName}_${targetData.tableName}" FOREIGN KEY ("${targetData.tableName}_id") REFERENCES "${targetData.tableName}"("${targetColName}")\n` +
        `);`
      )
    } else {
      lines.push(
        `ALTER TABLE "${sourceData.tableName}" ADD CONSTRAINT "fk_${sourceData.tableName}_${sourceColName}" FOREIGN KEY ("${sourceColName}") REFERENCES "${targetData.tableName}"("${targetColName}");`
      )
    }
  }

  return lines.join("\n\n")
}

function applyAutoLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 80, ranksep: 160 })

  for (const node of nodes) {
    const data = node.data as unknown as TableNodeData
    const colCount = Math.max(data.columns.length, 1)
    g.setNode(node.id, { width: 240, height: 36 * (colCount + 1) })
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  dagre.layout(g)

  return nodes.map((node) => {
    const dagreNode = g.node(node.id)
    return {
      ...node,
      position: { x: dagreNode.x - dagreNode.width / 2, y: dagreNode.y - dagreNode.height / 2 },
    }
  })
}

/* ========== Custom Table Node ========== */
function DbTableNode({ data }: NodeProps) {
  const { tableName, columns } = data as unknown as TableNodeData

  return (
    <div className="rounded-lg bg-card shadow-md overflow-hidden border border-border" style={{ minWidth: 200 }}>
      <div className="bg-primary text-primary-foreground px-3 py-2 font-semibold text-sm text-center truncate">
        {tableName}
      </div>
      <div className="divide-y divide-border">
        {columns.map((col: ColumnDef) => (
          <div key={col.id} className="flex items-center gap-1.5 px-3 py-1.5 text-xs relative">
            {/* Left handle (source) */}
            <Handle
              type="source"
              position={Position.Left}
              id={encodeHandleId("source", col.name, "left")}
              className="!w-3 !h-3 !bg-blue-400 hover:!bg-blue-600 !-left-1.5 !border-2 !border-white !rounded-full !transition-colors"
            />
            {col.isPK && (
              <span className="shrink-0 rounded bg-amber-100 text-amber-700 px-1 text-[0.65em] font-bold leading-none">
                PK
              </span>
            )}
            {col.isFK && (
              <span className="shrink-0 rounded bg-blue-100 text-blue-700 px-1 text-[0.65em] font-bold leading-none">
                FK
              </span>
            )}
            <span className="truncate font-medium flex-1">{col.name}</span>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[0.7em] text-muted-foreground font-mono">
              {col.type}
            </span>
            {/* Right handle (target) */}
            <Handle
              type="target"
              position={Position.Right}
              id={encodeHandleId("target", col.name, "right")}
              className="!w-3 !h-3 !bg-amber-400 hover:!bg-amber-600 !-right-1.5 !border-2 !border-white !rounded-full !transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = { dbTable: DbTableNode }

/* ========== Custom Relation Edge ========== */
function DbRelationEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 8,
  })

  const relType = (data as unknown as RelationEdgeData)?.relationType ?? "1:N"

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className={cn(
            "absolute rounded border px-1.5 py-0.5 text-[11px] font-medium shadow-sm cursor-pointer",
            selected
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border text-muted-foreground"
          )}
        >
          {relType}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const edgeTypes = { dbRelation: DbRelationEdge }

/* ========== Canvas Inner ========== */
function DbCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
}: {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: Parameters<typeof ReactFlow>[0]["onNodesChange"]
  onEdgesChange: Parameters<typeof ReactFlow>[0]["onEdgesChange"]
  onConnect: Parameters<typeof ReactFlow>[0]["onConnect"]
}) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ type: "dbRelation", data: { relationType: "1:N" } }}
      deleteKeyCode="Backspace"
    >
      <Background />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  )
}

/* ========== Main Page ========== */
export function DbDesignerPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [ddlOutput, setDdlOutput] = useState("")

  const addTable = useCallback(() => {
    const id = uid()
    const tableName = `table_${nodes.length + 1}`
    const newNode: Node = {
      id,
      type: "dbTable",
      position: { x: 100 + nodes.length * 30, y: 100 + nodes.length * 30 },
      data: {
        label: tableName,
        tableName,
        columns: [{ id: uid(), name: "id", type: "INT", isPK: true, isFK: false }],
      } satisfies TableNodeData,
    }
    setNodes((prev) => [...prev, newNode])
  }, [nodes.length, setNodes])

  const removeTable = useCallback((tableId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== tableId))
    setEdges((prev) => prev.filter((e) => e.source !== tableId && e.target !== tableId))
  }, [setNodes, setEdges])

  const startEditName = useCallback((tableId: string) => {
    const node = nodes.find((n) => n.id === tableId)
    if (!node) return
    const data = node.data as unknown as TableNodeData
    setEditingTableId(tableId)
    setEditName(data.tableName)
  }, [nodes])

  const confirmEditName = useCallback(() => {
    if (!editingTableId || !editName.trim()) return
    setNodes((prev) =>
      prev.map((n) =>
        n.id === editingTableId
          ? { ...n, data: { ...(n.data as unknown as TableNodeData), tableName: editName.trim(), label: editName.trim() } }
          : n
      )
    )
    setEditingTableId(null)
  }, [editingTableId, editName, setNodes])

  const addColumn = useCallback((tableId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== tableId) return n
        const data = n.data as unknown as TableNodeData
        return {
          ...n,
          data: {
            ...data,
            columns: [...data.columns, { id: uid(), name: `col_${data.columns.length + 1}`, type: "VARCHAR(255)", isPK: false, isFK: false }],
          },
        }
      })
    )
  }, [setNodes])

  const removeColumn = useCallback((tableId: string, colId: string) => {
    // Find column name before removing, to clean up related edges
    const node = nodes.find((n) => n.id === tableId)
    const col = node && ((node.data as unknown as TableNodeData).columns.find((c) => c.id === colId))
    if (col) {
      const sourceH = encodeHandleId("source", col.name, "left")
      const targetH = encodeHandleId("target", col.name, "right")
      setEdges((prev) => prev.filter((e) => e.sourceHandle !== sourceH && e.targetHandle !== targetH))
    }
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== tableId) return n
        const data = n.data as unknown as TableNodeData
        return { ...n, data: { ...data, columns: data.columns.filter((c) => c.id !== colId) } }
      })
    )
  }, [nodes, setNodes, setEdges])

  const updateColumn = useCallback((tableId: string, colId: string, field: keyof ColumnDef, value: string | boolean) => {
    // When renaming a column, update related edge handles
    if (field === "name" && typeof value === "string") {
      const node = nodes.find((n) => n.id === tableId)
      const col = node && ((node.data as unknown as TableNodeData).columns.find((c) => c.id === colId))
      if (col) {
        const oldSourceH = encodeHandleId("source", col.name, "left")
        const oldTargetH = encodeHandleId("target", col.name, "right")
        const newSourceH = encodeHandleId("source", value, "left")
        const newTargetH = encodeHandleId("target", value, "right")
        setEdges((prev) =>
          prev.map((e) => ({
            ...e,
            sourceHandle: e.sourceHandle === oldSourceH ? newSourceH : e.sourceHandle,
            targetHandle: e.targetHandle === oldTargetH ? newTargetH : e.targetHandle,
          }))
        )
      }
    }
    // When unchecking FK, remove the related edge
    if (field === "isFK" && value === false) {
      const node = nodes.find((n) => n.id === tableId)
      const col = node && ((node.data as unknown as TableNodeData).columns.find((c) => c.id === colId))
      if (col) {
        const sourceH = encodeHandleId("source", col.name, "left")
        setEdges((prev) => prev.filter((e) => !(e.source === tableId && e.sourceHandle === sourceH)))
      }
    }
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== tableId) return n
        const data = n.data as unknown as TableNodeData
        return {
          ...n,
          data: { ...data, columns: data.columns.map((c) => (c.id === colId ? { ...c, [field]: value } : c)) },
        }
      })
    )
  }, [nodes, setNodes, setEdges])

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    const newEdge: Edge = {
      id: `edge-${connection.source}-${connection.target}-${uid()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      type: "dbRelation",
      data: { relationType: "1:N" } satisfies RelationEdgeData,
    }
    setEdges((prev) => addEdge(newEdge, prev))
    // Auto-set isFK on the source column
    const sourceDecoded = decodeHandleId(connection.sourceHandle ?? "")
    if (sourceDecoded) {
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== connection.source) return n
          const d = n.data as unknown as TableNodeData
          return {
            ...n,
            data: { ...d, columns: d.columns.map((c) => c.name === sourceDecoded.colName ? { ...c, isFK: true } : c) },
          }
        })
      )
    }
  }, [setNodes, setEdges])

  const updateRelationType = useCallback((edgeId: string, relationType: RelationType) => {
    setEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, relationType } } : e
      )
    )
  }, [setEdges])

  const removeRelation = useCallback((edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId))
  }, [setEdges])

  const handleFkRefChange = useCallback((tableId: string, colId: string, refTableId: string, refColName: string) => {
    const node = nodes.find((n) => n.id === tableId)
    if (!node) return
    const data = node.data as unknown as TableNodeData
    const col = data.columns.find((c) => c.id === colId)
    if (!col) return

    const sourceHandle = encodeHandleId("source", col.name, "left")
    // Remove existing edge for this column
    setEdges((prev) => prev.filter((e) => !(e.source === tableId && e.sourceHandle === sourceHandle)))

    if (!refTableId || !refColName) return

    // Create new edge
    const targetHandle = encodeHandleId("target", refColName, "right")
    const newEdge: Edge = {
      id: `edge-${tableId}-${refTableId}-${uid()}`,
      source: tableId,
      target: refTableId,
      sourceHandle,
      targetHandle,
      type: "dbRelation",
      data: { relationType: "1:N" } satisfies RelationEdgeData,
    }
    setEdges((prev) => [...prev, newEdge])
  }, [nodes, setEdges])

  const handleAutoLayout = useCallback(() => {
    const layouted = applyAutoLayout(nodes, edges)
    setNodes(layouted)
  }, [nodes, edges, setNodes])

  const handleExportDDL = useCallback(() => {
    const ddl = generateDDL(nodes, edges)
    setDdlOutput(ddl)
  }, [nodes, edges])

  const handleCopyDDL = useCallback(() => {
    if (ddlOutput) navigator.clipboard.writeText(ddlOutput)
  }, [ddlOutput])

  const tableNodes = useMemo(() => nodes.filter((n) => n.type === "dbTable"), [nodes])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">数据库设计</h1>
          <p className="text-xs text-muted-foreground">可视化建表、导出 DDL</p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex gap-2">
            <Button onClick={addTable} className="flex-1" size="sm">
              <Plus className="size-3.5" /> 添加表
            </Button>
            <Button variant="outline" size="sm" onClick={handleAutoLayout}>
              <LayoutGrid className="size-3.5" /> 自动布局
            </Button>
          </div>

          {/* Table list */}
          <div className="space-y-2">
            {tableNodes.map((node) => {
              const data = node.data as unknown as TableNodeData
              const isEditing = editingTableId === node.id

              return (
                <div key={node.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center gap-1">
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-6 text-xs"
                          onKeyDown={(e) => { if (e.key === "Enter") confirmEditName() }}
                        />
                        <button onClick={confirmEditName} className="text-green-600 hover:text-green-700">
                          <Check className="size-3.5" />
                        </button>
                        <button onClick={() => setEditingTableId(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium truncate">{data.tableName}</span>
                        <button
                          onClick={() => startEditName(node.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </>
                    )}
                    <button onClick={() => removeTable(node.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  {/* Columns */}
                  <div className="space-y-1">
                    {data.columns.map((col) => {
                      const fkRef = getFkRefForColumn(node.id, col.name, edges)
                      const otherTables = tableNodes.filter((t) => t.id !== node.id)
                      const refTableData = fkRef ? (otherTables.find((t) => t.id === fkRef.refTableId)?.data as unknown as TableNodeData) : null
                      const refTableColumns = refTableData?.columns ?? []

                      return (
                        <div key={col.id} className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={col.isPK}
                              onChange={() => updateColumn(node.id, col.id, "isPK", !col.isPK)}
                              className="size-3 accent-amber-500"
                              title="Primary Key"
                            />
                            <input
                              type="checkbox"
                              checked={col.isFK}
                              onChange={() => updateColumn(node.id, col.id, "isFK", !col.isFK)}
                              className="size-3 accent-blue-500"
                              title="Foreign Key"
                            />
                            <Input
                              value={col.name}
                              onChange={(e) => updateColumn(node.id, col.id, "name", e.target.value)}
                              className="h-5 flex-1 text-[11px] px-1"
                            />
                            <select
                              value={col.type}
                              onChange={(e) => updateColumn(node.id, col.id, "type", e.target.value)}
                              className="h-5 rounded border border-input bg-transparent px-0.5 text-[11px] outline-none max-w-24"
                            >
                              {SQL_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <button onClick={() => removeColumn(node.id, col.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                              <X className="size-3" />
                            </button>
                          </div>
                          {col.isFK && (
                            <div className="flex items-center gap-1 text-[11px] pl-7">
                              <span className="text-muted-foreground shrink-0">引用:</span>
                              <select
                                value={fkRef?.refTableId ?? ""}
                                onChange={(e) => {
                                  const tid = e.target.value
                                  if (!tid) { handleFkRefChange(node.id, col.id, "", ""); return }
                                  const td = (tableNodes.find((t) => t.id === tid)?.data as unknown as TableNodeData)
                                  const pkCol = td?.columns.find((c) => c.isPK)
                                  handleFkRefChange(node.id, col.id, tid, pkCol?.name ?? "")
                                }}
                                className="h-5 rounded border border-input bg-transparent px-0.5 text-[11px] outline-none"
                              >
                                <option value="">选择表</option>
                                {otherTables.map((t) => (
                                  <option key={t.id} value={t.id}>{(t.data as unknown as TableNodeData).tableName}</option>
                                ))}
                              </select>
                              <span className="text-muted-foreground">.</span>
                              <select
                                value={fkRef?.refColName ?? ""}
                                onChange={(e) => handleFkRefChange(node.id, col.id, fkRef?.refTableId ?? "", e.target.value)}
                                className="h-5 rounded border border-input bg-transparent px-0.5 text-[11px] outline-none"
                              >
                                <option value="">选择列</option>
                                {refTableColumns.map((c) => (
                                  <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <button
                      onClick={() => addColumn(node.id)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      + 添加列
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Relations list */}
          {edges.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                关系 ({edges.length})
              </h2>
              {edges.map((edge) => {
                const sourceTable = tableNodes.find((n) => n.id === edge.source)
                const targetTable = tableNodes.find((n) => n.id === edge.target)
                if (!sourceTable || !targetTable) return null

                const sourceData = sourceTable.data as unknown as TableNodeData
                const targetData = targetTable.data as unknown as TableNodeData
                const relType = (edge.data as unknown as RelationEdgeData)?.relationType ?? "1:N"

                const sourceDecoded = decodeHandleId(edge.sourceHandle ?? "")
                const targetDecoded = decodeHandleId(edge.targetHandle ?? "")
                const sourceCol = sourceDecoded?.colName ?? "?"
                const targetCol = targetDecoded?.colName ?? "?"

                return (
                  <div key={edge.id} className="rounded-lg border border-border p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="font-medium truncate">{sourceData.tableName}.{sourceCol}</span>
                      <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                      <span className="font-medium truncate">{targetData.tableName}.{targetCol}</span>
                      <button
                        onClick={() => removeRelation(edge.id)}
                        className="ml-auto text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">类型:</span>
                      <select
                        value={relType}
                        onChange={(e) => updateRelationType(edge.id, e.target.value as RelationType)}
                        className="h-5 rounded border border-input bg-transparent px-1 text-[11px] outline-none"
                      >
                        <option value="1:1">1:1</option>
                        <option value="1:N">1:N</option>
                        <option value="M:N">M:N</option>
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Export DDL */}
          <div className="border-t border-border pt-3 space-y-2">
            <Button onClick={handleExportDDL} variant="outline" className="w-full" size="sm">
              <FileCode2 className="size-3.5" /> 导出 DDL
            </Button>
            {ddlOutput && (
              <div className="relative">
                <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-3 text-[11px] font-mono whitespace-pre-wrap">
                  {ddlOutput}
                </pre>
                <Button size="icon-xs" variant="ghost" className="absolute right-1 top-1" onClick={handleCopyDDL}>
                  <Check className="size-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <ReactFlowProvider>
          <DbCanvasInner
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
          />
        </ReactFlowProvider>
      </main>
    </div>
  )
}
