import { useState, useRef, useCallback, useEffect } from "react"
import QRCode from "qrcode"
import jsQR from "jsqr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Download, Upload, QrCode, ScanLine, Barcode, LayoutGrid,
} from "lucide-react"

type Mode = "generate" | "scan" | "barcode" | "batch"

/* ========== Code128 Encoder ========== */
const CODE128_PATTERNS: string[] = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100",
]

const CODE128_STOP = "1100011101011"

function encodeCode128(text: string): string {
  // Start Code B
  let pattern = "11010010000"
  let checksum = 104 // Start Code B value

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    const value = charCode - 32
    if (value < 0 || value > 95) continue
    pattern += CODE128_PATTERNS[value]
    checksum += value * (i + 1)
  }

  const checkDigit = checksum % 103
  pattern += CODE128_PATTERNS[checkDigit]
  pattern += CODE128_STOP

  return pattern
}

function drawBarcode(canvas: HTMLCanvasElement, text: string) {
  const pattern = encodeCode128(text)
  const barWidth = 2
  const height = 80
  const padding = 20

  canvas.width = pattern.length * barWidth + padding * 2
  canvas.height = height + padding * 2 + 16

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "#000000"
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "1") {
      ctx.fillRect(padding + i * barWidth, padding, barWidth, height)
    }
  }

  // Text below bars
  ctx.font = "12px monospace"
  ctx.textAlign = "center"
  ctx.fillText(text, canvas.width / 2, padding + height + 14)
}

/* ========== QR Code Generator ========== */
async function drawQrCode(canvas: HTMLCanvasElement, text: string, options: {
  size: number
  fgColor: string
  bgColor: string
  errorLevel: string
  bgImageSrc?: string | null
}) {
  if (options.bgImageSrc) {
    const bgImg = new Image()
    await new Promise<void>((resolve, reject) => {
      bgImg.onload = () => resolve()
      bgImg.onerror = () => reject()
      bgImg.src = options.bgImageSrc!
    })

    const maxDim = 1200
    const scale = Math.min(1, maxDim / Math.max(bgImg.width, bgImg.height))
    const cw = Math.round(bgImg.width * scale)
    const ch = Math.round(bgImg.height * scale)

    canvas.width = cw
    canvas.height = ch
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(bgImg, 0, 0, cw, ch)

    const qrSize = Math.min(options.size, cw * 0.8, ch * 0.8)

    const tempCanvas = document.createElement("canvas")
    await QRCode.toCanvas(tempCanvas, text, {
      width: qrSize,
      color: { dark: options.fgColor, light: "#00000000" },
      errorCorrectionLevel: options.errorLevel as "L" | "M" | "Q" | "H",
      margin: 2,
    })

    ctx.drawImage(tempCanvas, (cw - tempCanvas.width) / 2, (ch - tempCanvas.height) / 2)
  } else {
    await QRCode.toCanvas(canvas, text, {
      width: options.size,
      color: { dark: options.fgColor, light: options.bgColor },
      errorCorrectionLevel: options.errorLevel as "L" | "M" | "Q" | "H",
      margin: 2,
    })
  }
}

/* ========== Main Component ========== */
export function QrcodeToolPage() {
  const [mode, setMode] = useState<Mode>("generate")
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate QR state
  const [qrText, setQrText] = useState("https://example.com")
  const [qrSize, setQrSize] = useState(256)
  const [qrFgColor, setQrFgColor] = useState("#000000")
  const [qrBgColor, setQrBgColor] = useState("#ffffff")
  const [qrErrorLevel, setQrErrorLevel] = useState("M")
  const [bgImageData, setBgImageData] = useState<string | null>(null)

  // Scan state
  const [scanFileName, setScanFileName] = useState("")
  const [scanResult, setScanResult] = useState("")

  // Barcode state
  const [barcodeText, setBarcodeText] = useState("Hello-123")
  const [barcodeFormat, setBarcodeFormat] = useState<"code128" | "ean13">("code128")

  // Batch state
  const [batchInput, setBatchInput] = useState("Item 1\nItem 2\nItem 3")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const bgImageInputRef = useRef<HTMLInputElement>(null)

  /* ---- Generate QR ---- */
  const generateQr = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !qrText) return
    await drawQrCode(canvas, qrText, {
      size: qrSize,
      fgColor: qrFgColor,
      bgColor: qrBgColor,
      errorLevel: qrErrorLevel,
      bgImageSrc: bgImageData,
    })
  }, [qrText, qrSize, qrFgColor, qrBgColor, qrErrorLevel, bgImageData])

  useEffect(() => {
    if (mode === "generate") generateQr()
  }, [mode, generateQr])

  /* ---- Scan QR ---- */
  const handleScanFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanFileName(file.name)

    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const cvs = document.createElement("canvas")
        cvs.width = img.width
        cvs.height = img.height
        const ctx = cvs.getContext("2d")
        if (!ctx) { setScanResult("无法创建 Canvas"); return }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, cvs.width, cvs.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code) {
          setScanResult(code.data)
        } else {
          setScanResult("未检测到二维码，请确保图片包含清晰的 QR 码")
        }
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [])

  const handleBgImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setBgImageData(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ""
  }, [])

  /* ---- Generate Barcode ---- */
  const generateBarcode = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !barcodeText) return
    drawBarcode(canvas, barcodeText)
  }, [barcodeText])

  useEffect(() => {
    if (mode === "barcode") generateBarcode()
  }, [mode, generateBarcode])

  /* ---- Batch ---- */
  useEffect(() => {
    if (mode !== "batch") return
    const lines = batchInput.split("\n").filter((l) => l.trim())
    for (let i = 0; i < lines.length; i++) {
      const canvas = batchCanvasRefs.current.get(i)
      if (canvas) {
        drawQrCode(canvas, lines[i], {
          size: 150,
          fgColor: "#000000",
          bgColor: "#ffffff",
          errorLevel: "M",
        })
      }
    }
  }, [mode, batchInput])

  /* ---- Download ---- */
  const downloadCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = canvas.toDataURL("image/png")
    const a = document.createElement("a")
    a.href = url
    a.download = `${mode === "barcode" ? "barcode" : "qrcode"}.png`
    a.click()
  }, [mode])

  return (
    <div className="flex h-full">
      <aside className="w-80 shrink-0 border-r border-border bg-background flex flex-col overflow-y-auto">
        <div className="border-b border-border px-4 py-3">
          <h1 className="text-base font-bold">二维码 & 条形码</h1>
          <p className="text-xs text-muted-foreground">生成、扫描、批量处理</p>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {/* Mode buttons */}
          <div className="flex gap-1">
            {([
              { key: "generate" as Mode, icon: QrCode, label: "生成 QR" },
              { key: "scan" as Mode, icon: ScanLine, label: "扫描 QR" },
              { key: "barcode" as Mode, icon: Barcode, label: "条形码" },
              { key: "batch" as Mode, icon: LayoutGrid, label: "批量" },
            ]).map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                size="xs"
                variant={mode === key ? "default" : "outline"}
                onClick={() => setMode(key)}
                className="flex-1"
              >
                <Icon className="size-3" />
                {label}
              </Button>
            ))}
          </div>

          {/* Generate QR controls */}
          {mode === "generate" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">内容</label>
                <Input value={qrText} onChange={(e) => setQrText(e.target.value)} placeholder="输入文本或 URL" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">尺寸: {qrSize}px</label>
                <input
                  type="range" min={128} max={512} step={32}
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex gap-2">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium">前景色</label>
                  <input
                    type="color" value={qrFgColor}
                    onChange={(e) => setQrFgColor(e.target.value)}
                    className="h-7 w-full cursor-pointer rounded border border-border p-0.5"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium">背景色</label>
                  <input
                    type="color" value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="h-7 w-full cursor-pointer rounded border border-border p-0.5"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">背景图片</label>
                <input
                  ref={bgImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBgImage}
                  className="hidden"
                />
                <div className="flex gap-1">
                  <Button variant="outline" size="xs" onClick={() => bgImageInputRef.current?.click()} className="flex-1">
                    <Upload className="size-3" /> 选择图片
                  </Button>
                  {bgImageData && (
                    <Button variant="outline" size="xs" onClick={() => setBgImageData(null)} className="flex-1">
                      清除
                    </Button>
                  )}
                </div>
                {bgImageData && (
                  <div className="mt-1 overflow-hidden rounded border border-border">
                    <img src={bgImageData} alt="背景" className="h-auto w-full" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">容错级别</label>
                <div className="flex gap-1">
                  {(["L", "M", "Q", "H"] as const).map((level) => (
                    <Button
                      key={level}
                      size="xs"
                      variant={qrErrorLevel === level ? "default" : "outline"}
                      onClick={() => setQrErrorLevel(level)}
                      className="flex-1"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={generateQr} className="w-full">生成二维码</Button>
            </div>
          )}

          {/* Scan QR controls */}
          {mode === "scan" && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleScanFile}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <Upload className="size-4" /> 上传图片
              </Button>
              {scanFileName && (
                <p className="text-xs text-muted-foreground">已选择: {scanFileName}</p>
              )}
            </div>
          )}

          {/* Barcode controls */}
          {mode === "barcode" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">内容</label>
                <Input value={barcodeText} onChange={(e) => setBarcodeText(e.target.value)} placeholder="输入文本" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">格式</label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={barcodeFormat === "code128" ? "default" : "outline"}
                    onClick={() => setBarcodeFormat("code128")}
                    className="flex-1"
                  >
                    Code128
                  </Button>
                  <Button
                    size="sm"
                    variant={barcodeFormat === "ean13" ? "default" : "outline"}
                    onClick={() => setBarcodeFormat("ean13")}
                    className="flex-1"
                  >
                    EAN-13
                  </Button>
                </div>
              </div>
              <Button onClick={generateBarcode} disabled={!barcodeText} className="w-full">生成条形码</Button>
            </div>
          )}

          {/* Batch controls */}
          {mode === "batch" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">批量内容（每行一个）</label>
                <textarea
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  className="flex min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-xs font-mono outline-none focus:border-ring placeholder:text-muted-foreground"
                  placeholder="每行一个条目"
                />
              </div>
            </div>
          )}

          {/* Download button */}
          {(mode === "generate" || mode === "barcode") && (
            <Button variant="outline" onClick={downloadCanvas} className="w-full">
              <Download className="size-4" /> 下载图片
            </Button>
          )}
        </div>
      </aside>

      <main className="flex-1 bg-muted/30 overflow-auto p-6">
        {/* Generate QR / Barcode main */}
        {(mode === "generate" || mode === "barcode") && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-xl bg-background p-6 shadow-sm border border-border">
              <canvas ref={canvasRef} />
            </div>
          </div>
        )}

        {/* Scan QR main */}
        {mode === "scan" && (
          <div className="flex h-full items-center justify-center">
            {scanResult ? (
              <div className="max-w-lg space-y-4">
                <h2 className="text-lg font-semibold">扫描结果</h2>
                <div className="rounded-lg bg-background p-4 text-sm whitespace-pre-wrap border border-border">
                  {scanResult}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">上传包含二维码的图片进行扫描</p>
            )}
          </div>
        )}

        {/* Batch main */}
        {mode === "batch" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">批量生成</h2>
            <div className="grid grid-cols-4 gap-4">
              {batchInput.split("\n").filter((l) => l.trim()).map((line, i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-lg bg-background p-3 border border-border">
                  <canvas
                    ref={(el) => {
                      if (el) batchCanvasRefs.current.set(i, el)
                    }}
                  />
                  <span className="text-xs text-muted-foreground truncate max-w-36">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
