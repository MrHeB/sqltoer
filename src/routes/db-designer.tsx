import { useState, useCallback, useMemo } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  Handle,
  Position,
} from "@xyflow/react"
import type { Node, Edge, NodeProps, Connection } from "@xyflow/react"
import { useNodesState, useEdgesState, addEdge } from "@xyflow/react"
import dagre from "@dagrejs/dagre"
import "@xyflow/react/dist/style.css"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Plus, Trash2, LayoutGrid, FileCode2, Pencil, Check, X,
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

/* ========== Helpers ========== */
function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

const SQL_TYPES = [
  "INT", "BIGINT", "SMALLINT", "VARCHAR(255)", "CHAR(50)",
  "TEXT", "BOOLEAN", "DATE", "TIMESTAMP", "DECIMAL(10,2)",
  "FLOAT", "DOUBLE", "BLOB", "JSON",
]

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

    const sourceHandle = edge.sourceHandle ?? ""
    const targetHandle = edge.targetHandle ?? ""

    // Extract column name from handle id: "source-colName-left" or "target-colName-right"
    const sourceColName = sourceHandle.replace(/^source-/, "").replace(/-left$/, "").replace(/-right$/, "")
    const targetColName = targetHandle.replace(/^target-/, "").replace(/-left$/, "").replace(/-right$/, "")

    if (sourceColName && targetColName) {
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
              id={`source-${col.name}-left`}
              className="!w-2 !h-2 !bg-blue-500 !-left-1"
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
              id={`target-${col.name}-right`}
              className="!w-2 !h-2 !bg-amber-500 !-right-1"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = { dbTable: DbTableNode }

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
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{ type: "smoothstep", label: "1:N", style: { strokeWidth: 1.5 } }}
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
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== tableId) return n
        const data = n.data as unknown as TableNodeData
        return { ...n, data: { ...data, columns: data.columns.filter((c) => c.id !== colId) } }
      })
    )
  }, [setNodes])

  const updateColumn = useCallback((tableId: string, colId: string, field: keyof ColumnDef, value: string | boolean) => {
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
  }, [setNodes])

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return
    const newEdge: Edge = {
      id: `edge-${connection.source}-${connection.target}-${uid()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle ?? undefined,
      targetHandle: connection.targetHandle ?? undefined,
      type: "smoothstep",
      label: "1:N",
      style: { strokeWidth: 1.5 },
    }
    setEdges((prev) => addEdge(newEdge, prev))
  }, [setEdges])

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
                    {data.columns.map((col) => (
                      <div key={col.id} className="flex items-center gap-1 text-xs">
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
                    ))}
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
