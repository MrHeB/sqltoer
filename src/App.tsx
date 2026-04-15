import { useState, useMemo, useCallback } from "react"
import { SqlInputPanel } from "@/components/SqlInputPanel"
import { ErCanvas } from "@/components/ErCanvas"
import type { ErMode } from "@/components/Toolbar"
import { useSqlParser } from "@/hooks/useSqlParser"
import { schemaToElements } from "@/lib/schema-transformer"
import { schemaToChenElements } from "@/lib/chen-transformer"

export default function App() {
  const { schema, error, parse } = useSqlParser()
  const [mode, setMode] = useState<ErMode>("relational")
  const [fontSize, setFontSize] = useState(13)
  const [cardWidth, setCardWidth] = useState(250)
  const [borderWidth, setBorderWidth] = useState(1)

  const relationalElements = useMemo(
    () => (schema ? schemaToElements(schema, fontSize, cardWidth, borderWidth) : { nodes: [], edges: [] }),
    [schema, fontSize, cardWidth, borderWidth]
  )

  const chenElements = useMemo(
    () => (schema ? schemaToChenElements(schema, fontSize, cardWidth, borderWidth) : { nodes: [], edges: [] }),
    [schema, fontSize, cardWidth, borderWidth]
  )

  const { nodes, edges } = mode === "chen" ? chenElements : relationalElements

  const handleParse = useCallback(
    (sql: string) => {
      if (!sql.trim()) return
      parse(sql)
    },
    [parse]
  )

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">SQL to ER</h1>
          <p className="text-xs text-muted-foreground">输入 SQL DDL 生成 ER 图</p>
        </div>
        <SqlInputPanel onParse={handleParse} />
        {error && (
          <div className="mx-4 mb-4 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
      </aside>

      <main className="flex-1">
        {schema ? (
          <ErCanvas
            mode={mode}
            initialNodes={nodes}
            initialEdges={edges}
            fontSize={fontSize}
            cardWidth={cardWidth}
            borderWidth={borderWidth}
            onModeChange={setMode}
            onFontSizeChange={setFontSize}
            onCardWidthChange={setCardWidth}
            onBorderWidthChange={setBorderWidth}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>输入 SQL 语句并点击「生成 ER 图」</p>
          </div>
        )}
      </main>
    </div>
  )
}
