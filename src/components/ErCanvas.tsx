import { useCallback, useRef, useEffect } from "react"
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

const nodeTypes = {
  tableNode: TableNode,
  chenEntity: ChenEntityNode,
  chenAttribute: ChenAttributeNode,
  chenRelationship: ChenRelationshipNode,
}

const edgeTypes = {
  relationEdge: RelationEdge,
}

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

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // Update node data (fontSize, cardWidth, borderWidth) without resetting positions
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, fontSize, cardWidth, borderWidth },
      }))
    )
  }, [fontSize, cardWidth, borderWidth, setNodes])

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
      {/* key={mode} ensures full remount on mode switch so useNodesState reinitializes */}
      <ErCanvasInner key={props.mode} {...props} />
    </ReactFlowProvider>
  )
}
