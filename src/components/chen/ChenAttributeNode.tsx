import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"

interface ChenAttributeData {
  name: string
  isPK: boolean
  fontSize: number
  attrSize: number
  borderWidth: number
  [key: string]: unknown
}

export function ChenAttributeNode({ data }: NodeProps) {
  const { name, isPK, fontSize, attrSize, borderWidth } = data as ChenAttributeData

  return (
    <div
      className="bg-card flex items-center justify-center"
      style={{
        width: attrSize || 80,
        height: (attrSize || 80) * 0.45,
        borderRadius: "50%",
        borderWidth,
        borderStyle: "solid",
        borderColor: "#000",
        fontSize,
      }}
    >
      <span className={isPK ? "underline" : ""}>{name}</span>
      <Handle type="source" position={Position.Top} id="source-top" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Bottom} id="source-bottom" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Left} id="source-left" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
      <Handle type="source" position={Position.Right} id="source-right" className="!w-1.5 !h-1.5 !bg-foreground/30 !border-0" />
    </div>
  )
}
