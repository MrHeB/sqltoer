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
import { Toolbar } from "@/components/Toolbar"
import { exportDiagram } from "@/lib/export"

const nodeTypes = { tableNode: TableNode }
const edgeTypes = { relationEdge: RelationEdge }

interface ErCanvasInnerProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  fontSize: number
  cardWidth: number
  borderWidth: number
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onBorderWidthChange: (width: number) => void
}

function ErCanvasInner({
  initialNodes,
  initialEdges,
  fontSize,
  cardWidth,
  borderWidth,
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
        fontSize={fontSize}
        cardWidth={cardWidth}
        borderWidth={borderWidth}
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
  initialNodes: Node[]
  initialEdges: Edge[]
  fontSize: number
  cardWidth: number
  borderWidth: number
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
