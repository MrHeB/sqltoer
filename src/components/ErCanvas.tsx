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
  attrSize: number
  borderWidth: number
  edgeWidth: number
  onModeChange: (mode: ErMode) => void
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onAttrSizeChange: (size: number) => void
  onBorderWidthChange: (width: number) => void
  onEdgeWidthChange: (width: number) => void
}

function ErCanvasInner({
  mode,
  initialNodes,
  initialEdges,
  fontSize,
  cardWidth,
  attrSize,
  borderWidth,
  edgeWidth,
  onModeChange,
  onFontSizeChange,
  onCardWidthChange,
  onAttrSizeChange,
  onBorderWidthChange,
  onEdgeWidthChange,
}: ErCanvasInnerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update node data without resetting positions
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, fontSize, cardWidth, attrSize, borderWidth },
      }))
    )
  }, [fontSize, cardWidth, attrSize, borderWidth, setNodes])

  // Update edge data (edgeWidth) and style
  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: { ...e.data, edgeWidth },
        style: { ...e.style, strokeWidth: edgeWidth },
      }))
    )
  }, [edgeWidth, setEdges])

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
        attrSize={attrSize}
        borderWidth={borderWidth}
        edgeWidth={edgeWidth}
        onModeChange={onModeChange}
        onFontSizeChange={onFontSizeChange}
        onCardWidthChange={onCardWidthChange}
        onAttrSizeChange={onAttrSizeChange}
        onBorderWidthChange={onBorderWidthChange}
        onEdgeWidthChange={onEdgeWidthChange}
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
          <div
            className="pointer-events-none absolute bottom-3 right-4 z-10 text-xs text-muted-foreground/40 select-none"
          >
            联系作者：1687050390@qq.com
          </div>
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
  attrSize: number
  borderWidth: number
  edgeWidth: number
  onModeChange: (mode: ErMode) => void
  onFontSizeChange: (size: number) => void
  onCardWidthChange: (width: number) => void
  onAttrSizeChange: (size: number) => void
  onBorderWidthChange: (width: number) => void
  onEdgeWidthChange: (width: number) => void
}

export function ErCanvas(props: ErCanvasProps) {
  return (
    <ReactFlowProvider>
      <ErCanvasInner key={props.mode} {...props} />
    </ReactFlowProvider>
  )
}
