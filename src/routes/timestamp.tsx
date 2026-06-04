import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check, ArrowRight, ArrowLeft, RotateCw } from "lucide-react"

type Tab = "ts2date" | "date2ts"

interface QuickOffset { label: string; offset: number }
interface QuickTime { label: string; getTime: () => number }

const QUICK_TIMESTAMPS: (QuickOffset | QuickTime)[] = [
  { label: "1 小时前", offset: -3600 },
  { label: "今天 00:00", getTime: () => { const d = new Date(); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) } },
  { label: "明天 00:00", getTime: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) } },
  { label: "本周一 00:00", getTime: () => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) } },
  { label: "本月 1 日", getTime: () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return Math.floor(d.getTime() / 1000) } },
]

export function TimestampPage() {
  const [activeTab, setActiveTab] = useState<Tab>("ts2date")
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">时间戳转换</h1>
          <p className="text-xs text-muted-foreground">时间戳 ↔ 日期互转，多时区显示</p>
        </div>
        <div className="flex flex-col gap-1 p-3">
          <button
            onClick={() => setActiveTab("ts2date")}
            className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
              activeTab === "ts2date"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent/50"
            }`}
          >
            时间戳 → 日期
          </button>
          <button
            onClick={() => setActiveTab("date2ts")}
            className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
              activeTab === "date2ts"
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-accent/50"
            }`}
          >
            日期 → 时间戳
          </button>
        </div>
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">当前时间戳</span>
            <span className="font-mono text-xs text-primary">{Math.floor(now / 1000)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">毫秒级</span>
            <span className="font-mono text-xs text-muted-foreground">{now}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">北京时间</span>
            <span className="text-xs text-muted-foreground">{new Date(now).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 bg-muted/30 overflow-auto p-6">
        {activeTab === "ts2date" ? <Ts2DatePanel /> : <Date2TsPanel />}
      </main>
    </div>
  )
}

const TIMEZONES = [
  { label: "北京时间", tz: "Asia/Shanghai" },
  { label: "UTC", tz: "UTC" },
  { label: "东京", tz: "Asia/Tokyo" },
  { label: "纽约", tz: "America/New_York" },
  { label: "伦敦", tz: "Europe/London" },
  { label: "悉尼", tz: "Australia/Sydney" },
]

function Ts2DatePanel() {
  const [input, setInput] = useState("")
  const [results, setResults] = useState<{ tz: string; label: string; date: string }[]>([])
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

  const convert = useCallback(() => {
    setError("")
    const trimmed = input.trim()
    if (!trimmed) return

    const num = Number(trimmed)
    if (isNaN(num)) {
      setError("请输入有效的数字时间戳")
      setResults([])
      return
    }

    let ms: number
    if (trimmed.length <= 10) {
      ms = num * 1000
    } else {
      ms = num
    }

    const date = new Date(ms)
    if (isNaN(date.getTime())) {
      setError("无效的时间戳")
      setResults([])
      return
    }

    setResults(
      TIMEZONES.map(({ tz, label }) => ({
        tz,
        label,
        date: date.toLocaleString("zh-CN", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }),
      })),
    )
  }, [input])

  const copy = useCallback((value: string) => {
    navigator.clipboard.writeText(value)
    setCopied(value)
    setTimeout(() => setCopied(""), 1500)
  }, [])

  const fillNow = useCallback(() => {
    setInput(String(Math.floor(Date.now() / 1000)))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">时间戳 → 日期</h2>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/[^\d]/g, ""))}
          placeholder="输入时间戳（秒或毫秒）"
          className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
        />
        <Button size="icon" variant="outline" onClick={fillNow} title="填入当前时间戳">
          <RotateCw className="size-4" />
        </Button>
        <Button onClick={convert} disabled={!input}>
          <ArrowRight className="size-4" /> 转换
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {QUICK_TIMESTAMPS.map((item) => (
          <Button
            key={item.label}
            size="xs"
            variant="outline"
            onClick={() => {
              if ("offset" in item) {
                setInput(String(Math.floor(Date.now() / 1000) + item.offset))
              } else {
                setInput(String(item.getTime()))
              }
            }}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(({ tz, label, date }) => (
            <div key={tz} className="flex items-center gap-2 rounded-lg bg-card px-4 py-2">
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
              <code className="flex-1 font-mono text-sm">{date}</code>
              <Button size="icon-xs" variant="ghost" onClick={() => copy(date)}>
                {copied === date ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Date2TsPanel() {
  const [dateInput, setDateInput] = useState("")
  const [timeInput, setTimeInput] = useState("00:00:00")
  const [result, setResult] = useState<{ seconds: number; millis: number } | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")

  const convert = useCallback(() => {
    setError("")
    const dateStr = `${dateInput}T${timeInput}`
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      setError("无效的日期时间")
      setResult(null)
      return
    }
    setResult({ seconds: Math.floor(date.getTime() / 1000), millis: date.getTime() })
  }, [dateInput, timeInput])

  const copy = useCallback (async (value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(value)
    setTimeout(() => setCopied(""), 1500)
  }, [])

  const fillNow = useCallback(() => {
    const now = new Date()
    setDateInput(now.toISOString().slice(0, 10))
    setTimeInput(now.toTimeString().slice(0, 8))
  }, [])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold">日期 → 时间戳</h2>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
          <input
            type="time"
            step="1"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            className="w-36 rounded-lg border border-input bg-transparent px-3 py-2 text-sm font-mono outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fillNow}>
            <RotateCw className="size-3.5" /> 当前时间
          </Button>
          <Button onClick={convert} disabled={!dateInput}>
            <ArrowLeft className="size-4" /> 转换
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      {result && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">秒级时间戳</span>
            <code className="flex-1 font-mono text-lg font-semibold">{result.seconds}</code>
            <Button size="icon-xs" variant="ghost" onClick={() => copy(String(result.seconds))}>
              {copied === String(result.seconds) ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-3">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">毫秒时间戳</span>
            <code className="flex-1 font-mono text-lg font-semibold">{result.millis}</code>
            <Button size="icon-xs" variant="ghost" onClick={() => copy(String(result.millis))}>
              {copied === String(result.millis) ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2">
            <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">ISO 8601</span>
            <code className="flex-1 font-mono text-sm">{new Date(result.millis).toISOString()}</code>
            <Button size="icon-xs" variant="ghost" onClick={() => copy(new Date(result.millis).toISOString())}>
              {copied === new Date(result.millis).toISOString() ? <Check className="size-3" /> : <Copy className="size-3" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
