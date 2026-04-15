import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"

export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ strokeWidth: Number(data?.edgeWidth) || 1.5 }} className="!stroke-muted-foreground" />
      <EdgeLabelRenderer>
        <div
          className="pointer-events-none absolute rounded bg-background border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {String(data?.label ?? "1:N")}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
