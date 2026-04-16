import { useRef, useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"

interface PhotoUploadProps {
  fileName: string
  onFileSelect: (file: File) => void
}

export function PhotoUpload({ fileName, onFileSelect }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith("image/")) onFileSelect(file)
    },
    [onFileSelect],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
        isDragging ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
        className="hidden"
      />
      <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" />
        {fileName || "选择图片"}
      </Button>
      {!fileName && <p className="mt-2 text-xs text-muted-foreground">支持拖拽上传</p>}
    </div>
  )
}
