import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { TableNodeData } from "@/types"

const POSITIONS: Position[] = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export function TableNode({ data }: NodeProps) {
  const { tableName, columns, fontSize, cardWidth, borderWidth } = data as TableNodeData

  const connectedColumns = columns.filter((c) => c.isPrimaryKey || c.isForeignKey)

  return (
    <div
      className="rounded-lg bg-card shadow-md overflow-hidden"
      style={{ width: cardWidth, fontSize, borderWidth, borderColor: "var(--color-border)" }}
    >
      <div className="bg-primary text-primary-foreground px-3 py-2 font-semibold text-center">
        {tableName}
      </div>
      <div className="divide-y divide-border">
        {columns.map((col) => (
          <div key={col.name} className="flex items-center gap-1.5 px-3 py-1.5">
            {col.isPrimaryKey && (
              <span className="shrink-0 rounded bg-amber-100 text-amber-700 px-1 text-[0.7em] font-bold leading-none">
                PK
              </span>
            )}
            {col.isForeignKey && (
              <span className="shrink-0 rounded bg-blue-100 text-blue-700 px-1 text-[0.7em] font-bold leading-none">
                FK
              </span>
            )}
            <span className="truncate font-medium">{col.name}</span>
            <span className="ml-auto shrink-0 text-[0.85em] text-muted-foreground">{col.dataType}</span>
          </div>
        ))}
      </div>

      {connectedColumns.map((col) =>
        POSITIONS.map((pos) => [
          <Handle
            key={`source-${col.name}-${pos}`}
            type="source"
            position={pos}
            id={`source-${col.name}-${pos}`}
            className="!w-2 !h-2 !bg-blue-500"
          />,
          <Handle
            key={`target-${col.name}-${pos}`}
            type="target"
            position={pos}
            id={`target-${col.name}-${pos}`}
            className="!w-2 !h-2 !bg-amber-500"
          />,
        ])
      )}
    </div>
  )
}
