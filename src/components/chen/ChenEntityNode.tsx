import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"

interface ChenEntityData {
  tableName: string
  fontSize: number
  cardWidth: number
  borderWidth: number
  [key: string]: unknown
}

export function ChenEntityNode({ data }: NodeProps) {
  const { tableName, fontSize, cardWidth, borderWidth } = data as ChenEntityData

  return (
    <div
      className="bg-card flex items-center justify-center font-semibold"
      style={{
        width: cardWidth || 120,
        height: 50,
        borderWidth,
        borderStyle: "solid",
        borderColor: "#000",
        fontSize,
      }}
    >
      {tableName}
      <Handle type="target" position={Position.Top} id="target-top" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Top} id="source-top" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="target" position={Position.Left} id="target-left" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Left} id="source-left" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="target" position={Position.Right} id="target-right" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Right} id="source-right" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
    </div>
  )
}
