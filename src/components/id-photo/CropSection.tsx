import type { IdPhotoState } from "@/types/id-photo"
import { PHOTO_SIZE_TEMPLATES } from "@/lib/id-photo/standards"

interface CropSectionProps {
  selectedSizeId: IdPhotoState["selectedSizeId"]
  onSelectSize: (id: string) => void
}

export function CropSection({ selectedSizeId, onSelectSize }: CropSectionProps) {
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
      </div>
      {selectedSizeId && (
        <p className="text-xs text-muted-foreground">
          {(() => {
            const t = PHOTO_SIZE_TEMPLATES.find((t) => t.id === selectedSizeId)
            return t ? `${t.widthPx}×${t.heightPx}px（${t.widthMm}×${t.heightMm}mm）` : ""
          })()}
        </p>
      )}
    </div>
  )
}
