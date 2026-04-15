import { Handle, Position } from "@xyflow/react"
import type { NodeProps } from "@xyflow/react"
import type { TableNodeData } from "@/types"

export function TableNode({ data }: NodeProps) {
  const { tableName, columns, fontSize, cardWidth, borderWidth } = data as TableNodeData

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

      {columns.map((col) => {
        const handles = []

        if (col.isPrimaryKey) {
          handles.push(
            <Handle
              key={`pk-${col.name}`}
              type="source"
              position={Position.Right}
              id={`source-${col.name}`}
              className="!w-2 !h-2 !bg-amber-500"
            />
          )
          handles.push(
            <Handle
              key={`pk-target-${col.name}`}
              type="target"
              position={Position.Left}
              id={`target-${col.name}`}
              className="!w-2 !h-2 !bg-amber-500"
            />
          )
        }

        if (col.isForeignKey) {
          handles.push(
            <Handle
              key={`fk-${col.name}`}
              type="source"
              position={Position.Left}
              id={`source-${col.name}`}
              className="!w-2 !h-2 !bg-blue-500"
            />
          )
        }

        return handles
      })}
    </div>
  )
}
