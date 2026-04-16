import type { ComplianceCheckResult } from "@/types/id-photo"

interface CompliancePanelProps {
  results: ComplianceCheckResult[]
}

export function CompliancePanel({ results }: CompliancePanelProps) {
  if (results.length === 0) return null

  const passed = results.filter((r) => r.passed).length
  const total = results.length

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">合规检测</span>
        <span className={`text-xs ${passed === total ? "text-green-600" : "text-destructive"}`}>
          {passed}/{total} 通过
        </span>
      </div>
      <div className="space-y-1">
        {results.map((result, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={result.passed ? "text-green-600" : result.severity === "warning" ? "text-yellow-600" : "text-destructive"}>
              {result.passed ? "✓" : result.severity === "warning" ? "⚠" : "✗"}
            </span>
            <span className="text-muted-foreground">{result.rule}:</span>
            <span className={result.passed ? "text-green-600" : "text-destructive"}>{result.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
