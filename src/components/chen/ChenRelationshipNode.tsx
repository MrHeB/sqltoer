import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"

interface ChenRelationshipData {
  label: string
  fontSize: number
  borderWidth: number
  [key: string]: unknown
}

export function ChenRelationshipNode({ data }: NodeProps) {
  const { label, fontSize, borderWidth } = data as ChenRelationshipData

  return (
    <div style={{ width: 70, height: 70, position: "relative" }}>
      <svg width="70" height="70" style={{ position: "absolute", inset: 0 }}>
        <polygon
          points="35,3 67,35 35,67 3,35"
          fill="var(--color-card)"
          stroke="var(--color-border)"
          strokeWidth={borderWidth}
        />
      </svg>
      <div
        className="relative z-[1] flex items-center justify-center"
        style={{ width: 70, height: 70, fontSize }}
      >
        {label}
      </div>
      <Handle type="target" position={Position.Left} id="target-left" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Right} id="source-right" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="target" position={Position.Right} id="target-right" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Left} id="source-left" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="target" position={Position.Top} id="target-top" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="target" position={Position.Bottom} id="target-bottom" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Top} id="source-top" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
    </div>
  )
}
