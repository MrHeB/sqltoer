import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, ArrowRight, Minus } from "lucide-react"

type Indent = 2 | 4 | 8

const INDENT_OPTIONS: { value: Indent; label: string }[] = [
  { value: 2, label: "2 空格" },
  { value: 4, label: "4 空格" },
  { value: 8, label: "8 空格" },
]

export function JsonFormatterPage() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [indent, setIndent] = useState<Indent>(2)
  const [copied, setCopied] = useState(false)

  const format = useCallback(() => {
    setError("")
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed, null, indent))
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }, [input, indent])

  const minify = useCallback(() => {
    setError("")
    try {
      const parsed = JSON.parse(input)
      setOutput(JSON.stringify(parsed))
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }, [input])

  const sortKeys = useCallback(() => {
    setError("")
    try {
      const parsed = JSON.parse(input)
      const sorted = sortObjectKeys(parsed)
      setOutput(JSON.stringify(sorted, null, indent))
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON 格式错误")
      setOutput("")
    }
  }, [input, indent])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">JSON 格式化</h1>
          <p className="text-xs text-muted-foreground">格式化、压缩、排序 Key、语法校验</p>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <div className="space-y-2">
            <label className="text-xs font-medium">缩进方式</label>
            <div className="flex gap-1">
              {INDENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setIndent(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                    indent === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent/50 text-foreground hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={format} disabled={!input}>
              <ArrowRight className="size-4" /> 格式化
            </Button>
            <Button variant="outline" onClick={minify} disabled={!input}>
              <Minus className="size-4" /> 压缩
            </Button>
            <Button variant="outline" onClick={sortKeys} disabled={!input}>
              按 Key 排序
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 bg-muted/30 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">输入 JSON</label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='粘贴 JSON，例如：{"name": "test", "value": 123}'
              className="min-h-48 font-mono text-sm"
            />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {output && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">输出结果</label>
                <Button size="icon-xs" variant="ghost" onClick={copyOutput}>
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                </Button>
              </div>
              <Textarea
                value={output}
                readOnly
                className="min-h-48 font-mono text-sm"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function sortObjectKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObjectKeys)
  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
          return acc
        },
        {} as Record<string, unknown>,
      )
  }
  return obj
}
