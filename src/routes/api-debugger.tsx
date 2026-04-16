import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Send, Clock, ChevronDown, ChevronRight, Trash2, Copy, Check,
  Plus, X,
} from "lucide-react"

/* ========== Types ========== */
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
type SideTab = "headers" | "body" | "params"

interface KeyValueRow {
  id: string
  key: string
  value: string
  enabled: boolean
}

interface HistoryEntry {
  id: string
  method: HttpMethod
  url: string
  status: number
  duration: number
  timestamp: number
}

interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  duration: number
}

/* ========== Helpers ========== */
const STORAGE_KEY = "api-debugger-history"
const MAX_HISTORY = 50

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-green-500 text-white"
  if (status >= 300 && status < 400) return "bg-blue-500 text-white"
  if (status >= 400 && status < 500) return "bg-orange-500 text-white"
  return "bg-red-500 text-white"
}

function renderJsonWithSyntax(json: string): React.ReactNode {
  try {
    const obj = JSON.parse(json)
    const formatted = JSON.stringify(obj, null, 2)
    return highlightJson(formatted)
  } catch {
    return json
  }
}

function highlightJson(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  // Match JSON tokens: strings, numbers, booleans, null
  const regex = /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|(true|false)\b|(null)\b/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>)
    }
    if (match[1]) {
      // Key (string followed by colon)
      parts.push(<span key={key++} className="text-foreground">{match[1]}</span>)
      parts.push(<span key={key++}>{text.slice(match.index + match[1].length, match.index + match[0].length)}</span>)
    } else if (match[2]) {
      // String value
      parts.push(<span key={key++} className="text-green-600">{match[2]}</span>)
    } else if (match[3]) {
      // Number
      parts.push(<span key={key++} className="text-blue-600">{match[3]}</span>)
    } else if (match[4]) {
      // Boolean
      parts.push(<span key={key++} className="text-orange-600">{match[4]}</span>)
    } else if (match[5]) {
      // Null
      parts.push(<span key={key++} className="text-gray-500">{match[5]}</span>)
    }
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>)
  }

  return parts
}

/* ========== Main Component ========== */
export function ApiDebuggerPage() {
  const [method, setMethod] = useState<HttpMethod>("GET")
  const [url, setUrl] = useState("")
  const [sideTab, setSideTab] = useState<SideTab>("headers")
  const [headers, setHeaders] = useState<KeyValueRow[]>([
    { id: uid(), key: "Content-Type", value: "application/json", enabled: true },
  ])
  const [body, setBody] = useState("")
  const [params, setParams] = useState<KeyValueRow[]>([])
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [respHeadersOpen, setRespHeadersOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const addRow = useCallback((type: "headers" | "params") => {
    const setter = type === "headers" ? setHeaders : setParams
    setter((prev) => [...prev, { id: uid(), key: "", value: "", enabled: true }])
  }, [])

  const removeRow = useCallback((type: "headers" | "params", id: string) => {
    const setter = type === "headers" ? setHeaders : setParams
    setter((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const updateRow = useCallback((type: "headers" | "params", id: string, field: "key" | "value" | "enabled", val: string | boolean) => {
    const setter = type === "headers" ? setHeaders : setParams
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
  }, [])

  const buildUrl = useCallback(() => {
    const activeParams = params.filter((p) => p.enabled && p.key)
    if (activeParams.length === 0) return url
    const qs = activeParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&")
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}${qs}`
  }, [url, params])

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return
    setLoading(true)
    setResponse(null)

    const finalUrl = buildUrl()
    const activeHeaders = headers.filter((h) => h.enabled && h.key)
    const headerObj: Record<string, string> = {}
    for (const h of activeHeaders) {
      headerObj[h.key] = h.value
    }

    const startTime = performance.now()

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: headerObj,
      }

      if (method !== "GET" && method !== "DELETE" && body.trim()) {
        fetchOptions.body = body
      }

      const res = await fetch(finalUrl, fetchOptions)
      const duration = Math.round(performance.now() - startTime)
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      const responseBody = await res.text()

      const entry: HistoryEntry = {
        id: uid(),
        method,
        url: finalUrl,
        status: res.status,
        duration,
        timestamp: Date.now(),
      }
      const newHistory = [entry, ...history].slice(0, MAX_HISTORY)
      setHistory(newHistory)
      saveHistory(newHistory)

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: responseHeaders,
        body: responseBody,
        duration,
      })
    } catch (err) {
      const duration = Math.round(performance.now() - startTime)
      setResponse({
        status: 0,
        statusText: "Network Error",
        headers: {},
        body: String(err instanceof Error ? err.message : err),
        duration,
      })
    } finally {
      setLoading(false)
    }
  }, [url, method, headers, body, params, history, buildUrl])

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setMethod(entry.method)
    setUrl(entry.url.split("?")[0])
    setResponse(null)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const copyResponse = useCallback(() => {
    if (!response) return
    navigator.clipboard.writeText(response.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [response])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">API 调试器</h1>
          <p className="text-xs text-muted-foreground">发送 HTTP 请求，查看响应</p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {/* Method + URL */}
          <div className="flex gap-1.5">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm font-medium outline-none focus:border-ring"
            >
              {(["GET", "POST", "PUT", "DELETE", "PATCH"] as HttpMethod[]).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="flex-1"
            />
          </div>

          <Button onClick={sendRequest} disabled={!url.trim() || loading} className="w-full">
            <Send className="size-4" />
            {loading ? "发送中..." : "发送请求"}
          </Button>

          {/* Side Tabs */}
          <div className="flex gap-1 border-b border-border">
            {(["headers", "body", "params"] as SideTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setSideTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  sideTab === tab
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "headers" ? "Headers" : tab === "body" ? "Body" : "Params"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {sideTab === "headers" && (
            <div className="space-y-2">
              {headers.map((row) => (
                <KeyValueEditor
                  key={row.id}
                  row={row}
                  onUpdate={(field, val) => updateRow("headers", row.id, field, val)}
                  onRemove={() => removeRow("headers", row.id)}
                />
              ))}
              <Button size="xs" variant="ghost" onClick={() => addRow("headers")} className="w-full">
                <Plus className="size-3" /> 添加 Header
              </Button>
            </div>
          )}

          {sideTab === "body" && (
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder='{"key": "value"}'
              className="min-h-40 font-mono text-xs"
            />
          )}

          {sideTab === "params" && (
            <div className="space-y-2">
              {params.map((row) => (
                <KeyValueEditor
                  key={row.id}
                  row={row}
                  onUpdate={(field, val) => updateRow("params", row.id, field, val)}
                  onRemove={() => removeRow("params", row.id)}
                />
              ))}
              <Button size="xs" variant="ghost" onClick={() => addRow("params")} className="w-full">
                <Plus className="size-3" /> 添加参数
              </Button>
            </div>
          )}

          {/* History */}
          <div className="border-t border-border pt-3">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex w-full items-center justify-between text-xs font-medium"
            >
              <span>请求历史 ({history.length})</span>
              {historyOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>
            {historyOpen && (
              <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                {history.length === 0 && (
                  <p className="text-xs text-muted-foreground py-2">暂无历史记录</p>
                )}
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => loadFromHistory(entry)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/50"
                  >
                    <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${statusColor(entry.status)}`}>
                      {entry.method}
                    </span>
                    <span className="flex-1 truncate font-mono">{entry.url}</span>
                    <span className="text-muted-foreground">{entry.duration}ms</span>
                  </button>
                ))}
                {history.length > 0 && (
                  <Button size="xs" variant="ghost" onClick={clearHistory} className="w-full text-destructive">
                    <Trash2 className="size-3" /> 清空历史
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hidden file input for future body upload */}
        <input ref={fileInputRef} type="file" className="hidden" />
      </aside>

      <main className="flex-1 bg-muted/30 overflow-auto">
        {!response ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>输入 URL 并发送请求查看响应</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Status bar */}
            <div className="flex items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${statusColor(response.status)}`}>
                {response.status} {response.statusText}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" /> {response.duration}ms
              </span>
            </div>

            {/* Response Headers */}
            <div>
              <button
                onClick={() => setRespHeadersOpen(!respHeadersOpen)}
                className="flex items-center gap-1 text-sm font-medium"
              >
                {respHeadersOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                Response Headers
              </button>
              {respHeadersOpen && (
                <div className="mt-2 rounded-lg bg-background p-4">
                  <table className="w-full text-xs">
                    <tbody>
                      {Object.entries(response.headers).map(([key, value]) => (
                        <tr key={key} className="border-b border-border last:border-0">
                          <td className="py-1 pr-4 font-medium text-muted-foreground whitespace-nowrap">{key}</td>
                          <td className="py-1 font-mono break-all">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Response Body */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Response Body</span>
                <Button size="xs" variant="ghost" onClick={copyResponse}>
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? "已复制" : "复制"}
                </Button>
              </div>
              <pre className="max-h-[60vh] overflow-auto rounded-lg bg-background p-4 text-sm font-mono leading-relaxed">
                {renderJsonWithSyntax(response.body)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

/* ========== KeyValue Editor ========== */
function KeyValueEditor({
  row,
  onUpdate,
  onRemove,
}: {
  row: KeyValueRow
  onUpdate: (field: "key" | "value" | "enabled", val: string | boolean) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="checkbox"
        checked={row.enabled}
        onChange={(e) => onUpdate("enabled", e.target.checked)}
        className="size-3.5 accent-primary"
      />
      <Input
        value={row.key}
        onChange={(e) => onUpdate("key", e.target.value)}
        placeholder="Key"
        className="h-7 flex-1 text-xs"
      />
      <Input
        value={row.value}
        onChange={(e) => onUpdate("value", e.target.value)}
        placeholder="Value"
        className="h-7 flex-1 text-xs"
      />
      <button onClick={onRemove} className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive">
        <X className="size-3" />
      </button>
    </div>
  )
}
