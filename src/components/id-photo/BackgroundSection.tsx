import type { BgColorPreset } from "@/types/id-photo"
import { BG_COLOR_PRESETS } from "@/lib/id-photo/standards"
import { Input } from "@/components/ui/input"

interface BackgroundSectionProps {
  selectedBgColor: BgColorPreset
  customBgColor: string
  bgRemoved: boolean
  isProcessing: boolean
  blurLevel: number
  onBlurLevelChange: (level: number) => void
  onRemoveBg: () => void
  onSelectColor: (preset: BgColorPreset, customColor?: string) => void
}

export function BackgroundSection({
  selectedBgColor,
  customBgColor,
  bgRemoved,
  isProcessing,
  blurLevel,
  onBlurLevelChange,
  onRemoveBg,
  onSelectColor,
}: BackgroundSectionProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onRemoveBg}
        disabled={isProcessing}
        className="w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isProcessing ? "抠图中..." : bgRemoved ? "重新抠图" : "智能抠图"}
      </button>

      {bgRemoved && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">背景样式</label>
          <div className="flex flex-wrap gap-1.5">
            {BG_COLOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelectColor(preset.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                  selectedBgColor === preset.id
                    ? "ring-2 ring-primary ring-offset-1"
                    : "hover:bg-accent/50"
                }`}
              >
                <span
                  className="inline-block size-3 rounded-full border border-border"
                  style={{
                    background: preset.id === "blur"
                      ? "linear-gradient(135deg, #ccc 0%, #999 100%)"
                      : preset.color.startsWith("linear")
                        ? "#438edb"
                        : preset.color,
                  }}
                />
                {preset.name}
              </button>
            ))}
          </div>
          {selectedBgColor === "custom" && (
            <Input
              type="color"
              value={customBgColor}
              onChange={(e) => onSelectColor("custom", e.target.value)}
              className="h-8 w-16 p-0.5 cursor-pointer"
            />
          )}
          {selectedBgColor === "blur" && (
            <div className="space-y-0.5">
              <label className="text-xs text-muted-foreground">模糊强度: {blurLevel}px</label>
              <input
                type="range"
                min={5}
                max={50}
                value={blurLevel}
                onChange={(e) => onBlurLevelChange(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
