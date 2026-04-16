import type { Hsl } from "./conversions"
import { hslToRgb, rgbToHex } from "./conversions"

export type PaletteType = "complementary" | "analogous" | "triadic" | "split-complementary" | "monochromatic"

/** 生成调色板 */
export function generatePalette(baseHsl: Hsl, type: PaletteType): string[] {
  const offsets = PALETTE_OFFSETS[type]
  return offsets.map((offset) => {
    const h = (baseHsl.h + offset + 360) % 360
    return rgbToHex(hslToRgb({ h, s: baseHsl.s, l: baseHsl.l }))
  })
}

/** 单色调色板（不同明度） */
export function generateMonochromatic(baseHsl: Hsl): string[] {
  const lightnesses = [20, 35, 50, 65, 80]
  return lightnesses.map((l) => rgbToHex(hslToRgb({ h: baseHsl.h, s: baseHsl.s, l })))
}

const PALETTE_OFFSETS: Record<PaletteType, number[]> = {
  complementary: [0, 180],
  analogous: [-30, 0, 30],
  triadic: [0, 120, 240],
  "split-complementary": [0, 150, 210],
  monochromatic: [0, 0, 0, 0, 0],
}
