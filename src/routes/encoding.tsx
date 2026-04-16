import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Check, ArrowRight } from "lucide-react"

type Tab = "base64" | "url" | "jwt" | "hash" | "unicode" | "html"

const TABS: { key: Tab; label: string }[] = [
  { key: "base64", label: "Base64" },
  { key: "url", label: "URL 编解码" },
  { key: "jwt", label: "JWT 解析" },
  { key: "hash", label: "Hash 计算" },
  { key: "unicode", label: "Unicode" },
  { key: "html", label: "HTML 实体" },
]

export function EncodingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("base64")

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">编解码工具箱</h1>
          <p className="text-xs text-muted-foreground">Base64、URL、JWT、Hash、Unicode、HTML 实体</p>
        </div>
        <div className="flex flex-col gap-1 p-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </aside>
      <main className="flex-1 bg-muted/30 overflow-auto p-6">
        {activeTab === "base64" && <Base64Panel />}
        {activeTab === "url" && <UrlPanel />}
        {activeTab === "jwt" && <JwtPanel />}
        {activeTab === "hash" && <HashPanel />}
        {activeTab === "unicode" && <UnicodePanel />}
        {activeTab === "html" && <HtmlEntityPanel />}
      </main>
    </div>
  )
}

/* ========== Base64 ========== */
function Base64Panel() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const encode = useCallback(() => {
    try {
      setOutput(btoa(unescape(encodeURIComponent(input))))
    } catch {
      setOutput("编码失败：输入包含无效字符")
    }
  }, [input])

  const decode = useCallback(() => {
    try {
      setOutput(decodeURIComponent(escape(atob(input.trim()))))
    } catch {
      setOutput("解码失败：输入不是有效的 Base64 字符串")
    }
  }, [input])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">Base64 编解码</h2>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入文本..."
        className="min-h-32 font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button onClick={encode} disabled={!input}><ArrowRight className="size-4" /> 编码</Button>
        <Button variant="outline" onClick={decode} disabled={!input}>解码</Button>
      </div>
      <div className="relative">
        <Textarea
          value={output}
          readOnly
          placeholder="输出结果..."
          className="min-h-32 font-mono text-sm"
        />
        {output && (
          <Button size="icon-xs" variant="ghost" className="absolute right-2 top-2" onClick={copyOutput}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}

/* ========== URL 编解码 ========== */
function UrlPanel() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const encode = useCallback(() => {
    setOutput(encodeURIComponent(input))
  }, [input])

  const decode = useCallback(() => {
    try {
      setOutput(decodeURIComponent(input))
    } catch {
      setOutput("解码失败：输入不是有效的编码字符串")
    }
  }, [input])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">URL 编解码</h2>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入 URL 或编码字符串..."
        className="min-h-32 font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button onClick={encode} disabled={!input}><ArrowRight className="size-4" /> 编码</Button>
        <Button variant="outline" onClick={decode} disabled={!input}>解码</Button>
      </div>
      <div className="relative">
        <Textarea value={output} readOnly placeholder="输出结果..." className="min-h-32 font-mono text-sm" />
        {output && (
          <Button size="icon-xs" variant="ghost" className="absolute right-2 top-2" onClick={copyOutput}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}

/* ========== JWT 解析 ========== */
function JwtPanel() {
  const [input, setInput] = useState("")
  const [header, setHeader] = useState<string | null>(null)
  const [payload, setPayload] = useState<string | null>(null)
  const [expiry, setExpiry] = useState<string | null>(null)
  const [error, setError] = useState("")

  const parse = useCallback(() => {
    setError("")
    setHeader(null)
    setPayload(null)
    setExpiry(null)

    const parts = input.trim().split(".")
    if (parts.length !== 3) {
      setError("无效的 JWT 格式：需要三段以 . 分隔")
      return
    }

    try {
      const h = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")))
      setHeader(JSON.stringify(h, null, 2))
    } catch {
      setError("Header 解析失败")
      return
    }

    try {
      const p = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")))
      setPayload(JSON.stringify(p, null, 2))
      if (typeof p.exp === "number") {
        const expDate = new Date(p.exp * 1000)
        const isExpired = expDate < new Date()
        setExpiry(`${expDate.toLocaleString()}（${isExpired ? "已过期" : "未过期"}）`)
      }
    } catch {
      setError("Payload 解析失败")
    }
  }, [input])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">JWT 解析</h2>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="粘贴 JWT Token..."
        className="min-h-24 font-mono text-sm"
      />
      <Button onClick={parse} disabled={!input}>解析</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {header && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Header</h3>
          <pre className="rounded-lg bg-background p-4 text-sm font-mono overflow-auto">{header}</pre>
        </div>
      )}
      {payload && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Payload</h3>
          <pre className="rounded-lg bg-background p-4 text-sm font-mono overflow-auto">{payload}</pre>
        </div>
      )}
      {expiry && (
        <div className="rounded-lg bg-background px-4 py-2 text-sm">
          过期时间：<span className="font-medium">{expiry}</span>
        </div>
      )}
    </div>
  )
}

/* ========== Hash 计算 ========== */
function HashPanel() {
  const [input, setInput] = useState("")
  const [hashes, setHashes] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState("")

  const compute = useCallback(async () => {
    if (!input) return
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    const algorithms: HashAlgorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"]
    const results: Record<string, string> = {}

    for (const algo of algorithms) {
      const hashBuffer = await crypto.subtle.digest(algo, data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      results[algo] = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    }

    setHashes(results)
  }, [input])

  const copy = useCallback((algo: string, value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(algo)
    setTimeout(() => setCopied(""), 1500)
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">Hash 计算</h2>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入文本..."
        className="min-h-24 font-mono text-sm"
      />
      <Button onClick={compute} disabled={!input}>计算 Hash</Button>
      {Object.keys(hashes).length > 0 && (
        <div className="space-y-2">
          {(["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const).map((algo) => (
            <div key={algo} className="flex items-center gap-2 rounded-lg bg-background px-4 py-2">
              <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{algo}</span>
              <code className="flex-1 break-all font-mono text-xs">{hashes[algo]}</code>
              <Button size="icon-xs" variant="ghost" onClick={() => copy(algo, hashes[algo])}>
                {copied === algo ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"

/* ========== Unicode ========== */
function UnicodePanel() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const toUnicode = useCallback(() => {
    setOutput(
      Array.from(input)
        .map((ch) => {
          const code = ch.codePointAt(0)
          if (code === undefined) return ch
          return code > 0xffff ? `\\u{${code.toString(16).toUpperCase()}}` : `\\u${code.toString(16).toUpperCase().padStart(4, "0")}`
        })
        .join("")
    )
  }, [input])

  const fromUnicode = useCallback(() => {
    try {
      const result = input.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, p1, p2) => {
        const code = parseInt(p1 ?? p2, 16)
        return String.fromCodePoint(code)
      })
      setOutput(result)
    } catch {
      setOutput("转换失败")
    }
  }, [input])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">Unicode 转换</h2>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入文本或 \\uXXXX 格式..."
        className="min-h-32 font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button onClick={toUnicode} disabled={!input}>文本 → Unicode</Button>
        <Button variant="outline" onClick={fromUnicode} disabled={!input}>Unicode → 文本</Button>
      </div>
      <div className="relative">
        <Textarea value={output} readOnly placeholder="输出结果..." className="min-h-32 font-mono text-sm" />
        {output && (
          <Button size="icon-xs" variant="ghost" className="absolute right-2 top-2" onClick={copyOutput}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}

/* ========== HTML 实体 ========== */
const HTML_ENTITIES: [string, string][] = [
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]

function encodeHtml(str: string): string {
  let result = str
  for (const [char, entity] of HTML_ENTITIES) {
    result = result.replaceAll(char, entity)
  }
  return result
}

function decodeHtml(str: string): string {
  const el = document.createElement("textarea")
  el.innerHTML = str
  return el.value
}

function HtmlEntityPanel() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [copied, setCopied] = useState(false)

  const encode = useCallback(() => setOutput(encodeHtml(input)), [input])
  const decode = useCallback(() => setOutput(decodeHtml(input)), [input])

  const copyOutput = useCallback(() => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [output])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">HTML 实体编解码</h2>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入文本或 HTML 实体..."
        className="min-h-32 font-mono text-sm"
      />
      <div className="flex gap-2">
        <Button onClick={encode} disabled={!input}><ArrowRight className="size-4" /> 编码</Button>
        <Button variant="outline" onClick={decode} disabled={!input}>解码</Button>
      </div>
      <div className="relative">
        <Textarea value={output} readOnly placeholder="输出结果..." className="min-h-32 font-mono text-sm" />
        {output && (
          <Button size="icon-xs" variant="ghost" className="absolute right-2 top-2" onClick={copyOutput}>
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        )}
      </div>
    </div>
  )
}
