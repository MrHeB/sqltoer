import { useCallback, useRef, useMemo } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from "@xyflow/react"
import type { Node, Edge } from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { TableNode } from "@/components/TableNode"
import { RelationEdge } from "@/components/RelationEdge"
import { ChenEntityNode } from "@/components/chen/ChenEntityNode"
import { ChenAttributeNode } from "@/components/chen/ChenAttributeNode"
import { ChenRelationshipNode } from "@/components/chen/ChenRelationshipNode"
import { Toolbar, type ErMode } from "@/components/Toolbar"
import { exportDiagram } from "@/lib/export"

const relationalNodeTypes = { tableNode: TableNode }
const relationalEdgeTypes = { relationEdge: RelationEdge }
const chenNodeTypes = { chenEntity: ChenEntityNode, chenAttribute: ChenAttributeNode, chenRelationship: ChenRelationshipNode }

interface ErCanvasInnerProps {
  mode: ErMode
  initialNodes: Node[]
  initialEdges: Edge[]
  fontSize: number
  cardWidth: number
  borderWidth: number
  onModeChange: (mode: ErMode) => void
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onBorderWidthChange: (width: number) => void
}

function ErCanvasInner({
  mode,
  initialNodes,
  initialEdges,
  fontSize,
  cardWidth,
  borderWidth,
  onModeChange,
  onFontSizeChange,
  onCardWidthChange,
  onBorderWidthChange,
}: ErCanvasInnerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const nodesWithStyle = useMemo(
    () =>
      initialNodes.map((node) => ({
        ...node,
        data: { ...node.data, fontSize, cardWidth, borderWidth },
      })),
    [initialNodes, fontSize, cardWidth, borderWidth]
  )

  const [nodes, , onNodesChange] = useNodesState(nodesWithStyle)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const nodeTypes = mode === "chen" ? chenNodeTypes : relationalNodeTypes
  const edgeTypes = mode === "chen" ? undefined : relationalEdgeTypes

  const handleExport = useCallback(
    async (format: "png" | "svg") => {
      if (!wrapperRef.current) return
      await exportDiagram(wrapperRef.current, nodes, format)
    },
    [nodes]
  )

  return (
    <div className="flex h-full flex-col">
      <Toolbar
        mode={mode}
        fontSize={fontSize}
        cardWidth={cardWidth}
        borderWidth={borderWidth}
        onModeChange={onModeChange}
        onFontSizeChange={onFontSizeChange}
        onCardWidthChange={onCardWidthChange}
        onBorderWidthChange={onBorderWidthChange}
        onExport={handleExport}
      />
      <div ref={wrapperRef} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
        >
          <Background />
          <Controls />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
    </div>
  )
}

interface ErCanvasProps {
  mode: ErMode
  initialNodes: Node[]
  initialEdges: Edge[]
  fontSize: number
  cardWidth: number
  borderWidth: number
  onModeChange: (mode: ErMode) => void
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onBorderWidthChange: (width: number) => void
}

export function ErCanvas(props: ErCanvasProps) {
  return (
    <ReactFlowProvider>
      <ErCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
