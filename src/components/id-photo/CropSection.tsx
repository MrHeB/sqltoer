import { useState } from "react"
import type { IdPhotoState, CustomSize } from "@/types/id-photo"
import { PHOTO_SIZE_TEMPLATES } from "@/lib/id-photo/standards"
import { Input } from "@/components/ui/input"

interface CropSectionProps {
  selectedSizeId: IdPhotoState["selectedSizeId"]
  onSelectSize: (id: string) => void
  onCustomSize: (size: CustomSize) => void
}

export function CropSection({ selectedSizeId, onSelectSize, onCustomSize }: CropSectionProps) {
  const [customW, setCustomW] = useState(295)
  const [customH, setCustomH] = useState(413)

  const handleCustomApply = () => {
    if (customW > 0 && customH > 0) {
      onCustomSize({ widthPx: customW, heightPx: customH })
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium">证件照规格</label>
      <div className="grid grid-cols-3 gap-1.5">
        {PHOTO_SIZE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectSize(t.id)}
            className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
              selectedSizeId === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-accent-foreground hover:bg-accent"
            }`}
          >
            {t.name}
          </button>
        ))}
        <button
          onClick={() => {
            onSelectSize("custom")
            handleCustomApply()
          }}
          className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
            selectedSizeId === "custom"
              ? "bg-primary text-primary-foreground"
              : "bg-accent/50 text-accent-foreground hover:bg-accent"
          }`}
        >
          自定义
        </button>
      </div>

      {selectedSizeId && selectedSizeId !== "custom" && (
        <p className="text-xs text-muted-foreground">
          {(() => {
            const t = PHOTO_SIZE_TEMPLATES.find((t) => t.id === selectedSizeId)
            return t ? `${t.widthPx}×${t.heightPx}px（${t.widthMm}×${t.heightMm}mm）` : ""
          })()}
        </p>
      )}

      {selectedSizeId === "custom" && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">宽 (px)</label>
              <Input
                type="number"
                min={1}
                value={customW}
                onChange={(e) => setCustomW(Number(e.target.value))}
                className="h-7 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">高 (px)</label>
              <Input
                type="number"
                min={1}
                value={customH}
                onChange={(e) => setCustomH(Number(e.target.value))}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <button
            onClick={handleCustomApply}
            className="w-full rounded-md bg-accent px-2 py-1 text-xs hover:bg-accent/80"
          >
            应用自定义尺寸
          </button>
        </div>
      )}
    </div>
  )
}
