/** 磨皮（简化双边滤波近似） */
export function skinSmooth(imageData: ImageData, level: number): ImageData {
  if (level === 0) return imageData
  const data = new Uint8ClampedArray(imageData.data)
  const w = imageData.width
  const h = imageData.height
  const radius = Math.ceil(level / 20) // 0~5
  const threshold = 20 + level * 0.5

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4
      let sumR = 0, sumG = 0, sumB = 0, count = 0

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue
          const nIdx = (ny * w + nx) * 4
          const diff = Math.abs(data[nIdx] - data[idx]) +
            Math.abs(data[nIdx + 1] - data[idx + 1]) +
            Math.abs(data[nIdx + 2] - data[idx + 2])
          if (diff < threshold * 3) {
            sumR += data[nIdx]
            sumG += data[nIdx + 1]
            sumB += data[nIdx + 2]
            count++
          }
        }
      }

      if (count > 0) {
        const blend = level / 100
        data[idx] = data[idx] * (1 - blend) + (sumR / count) * blend
        data[idx + 1] = data[idx + 1] * (1 - blend) + (sumG / count) * blend
        data[idx + 2] = data[idx + 2] * (1 - blend) + (sumB / count) * blend
      }
    }
  }

  return new ImageData(data, w, h)
}

/** 美白（仅提亮肤色区域） */
export function skinWhitening(imageData: ImageData, level: number): ImageData {
  if (level === 0) return imageData
  const data = new Uint8ClampedArray(imageData.data)
  const factor = level / 100

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    if (isSkinTone(r, g, b)) {
      const brightness = (r + g + b) / 3
      const target = Math.min(255, brightness + (255 - brightness) * factor * 0.4)
      const ratio = target / Math.max(brightness, 1)
      data[i] = Math.min(255, r * ratio)
      data[i + 1] = Math.min(255, g * ratio)
      data[i + 2] = Math.min(255, b * ratio)
    }
  }

  return new ImageData(data, imageData.width, imageData.height)
}

/** 简单肤色检测 */
function isSkinTone(r: number, g: number, b: number): boolean {
  return (
    r > 95 && g > 40 && b > 20 &&
    r > g && r > b &&
    Math.abs(r - g) > 15 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15
  )
}
