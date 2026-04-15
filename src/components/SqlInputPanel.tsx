import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { EXAMPLE_SQL } from "@/lib/example-sql"

interface SqlInputPanelProps {
  onParse: (sql: string) => void
}

export function SqlInputPanel({ onParse }: SqlInputPanelProps) {
  const [sql, setSql] = useState("")

  return (
    <div className="flex h-full flex-col gap-3 p-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold">SQL DDL</h2>
        <Button variant="ghost" size="sm" onClick={() => setSql(EXAMPLE_SQL)}>
          加载示例
        </Button>
      </div>
      <Textarea
        className="flex-1 min-h-0 resize-none font-mono text-xs"
        placeholder="输入 CREATE TABLE 语句..."
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />
      <Button onClick={() => onParse(sql)} className="w-full shrink-0">
        生成 ER 图
      </Button>
    </div>
  )
}
