import { useState, useRef, useCallback } from "react"
import type { IdPhotoState, BgColorPreset, ComplianceCheckResult, HistorySnapshot, CustomSize } from "@/types/id-photo"
import { PHOTO_SIZE_TEMPLATES, BG_COLOR_PRESETS } from "@/lib/id-photo/standards"
import {
  loadImageElement,
  cropImage,
  resizeImage,
  canvasToImageData,
  imageDataToCanvas,
  adjustBrightness,
  adjustContrast,
  adjustSaturation,
  adjustSharpen,
  repairVignette,
} from "@/lib/id-photo/image-operations"
import {
  removeImageBackground,
  applyBackgroundColor,
  applyBlurBackground,
} from "@/lib/id-photo/background-removal"
import { skinSmooth, skinWhitening } from "@/lib/id-photo/beauty-filter"
import { detectFace } from "@/lib/id-photo/face-detect"
import { checkCompliance } from "@/lib/id-photo/compliance-check"

const initialState: IdPhotoState = {
  sourceImage: null,
  sourceFileName: "",
  processedCanvas: null,
  isProcessing: false,
  processingMessage: "",
  bgRemoved: false,
  selectedBgColor: "blue",
  customBgColor: "#438edb",
  transparentBlob: null,
  selectedSizeId: "one-inch",
  cropArea: null,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  smoothLevel: 0,
  whiteningLevel: 0,
  sharpenLevel: 0,
  vignetteRepair: 0,
  blurLevel: 20,
  faceDetection: null,
  complianceResults: [],
  batchFiles: [],
  batchProgress: 0,
}

function snapshotFromState(s: IdPhotoState): HistorySnapshot {
  return {
    brightness: s.brightness,
    contrast: s.contrast,
    saturation: s.saturation,
    smoothLevel: s.smoothLevel,
    whiteningLevel: s.whiteningLevel,
    sharpenLevel: s.sharpenLevel,
    vignetteRepair: s.vignetteRepair,
    blurLevel: s.blurLevel,
    selectedBgColor: s.selectedBgColor,
    customBgColor: s.customBgColor,
    selectedSizeId: s.selectedSizeId,
    customSize: null,
  }
}

export function useIdPhoto() {
  const [state, setState] = useState<IdPhotoState>(initialState)
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null)
  const bgRemovedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const customSizeRef = useRef<CustomSize | null>(null)

  // 撤销/重做历史
  const historyRef = useRef<HistorySnapshot[]>([])
  const historyIdxRef = useRef(-1)

  const pushHistory = useCallback((s: IdPhotoState) => {
    const snap = snapshotFromState(s)
    // 如果不在末尾，截断后面的历史
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1)
    historyRef.current.push(snap)
    historyIdxRef.current = historyRef.current.length - 1
  }, [])

  const getBaseCanvas = useCallback(() => {
    return bgRemovedCanvasRef.current || sourceCanvasRef.current
  }, [])

  /** 获取当前模板尺寸（预设 or 自定义） */
  const getTemplateSize = useCallback((sizeId: string): { widthPx: number; heightPx: number } | null => {
    if (sizeId === "custom") {
      return customSizeRef.current
    }
    return PHOTO_SIZE_TEMPLATES.find((t) => t.id === sizeId) ?? null
  }, [])

  /** 加载图片 */
  const loadImage = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file)
    const img = await loadImageElement(url)
    URL.revokeObjectURL(url)

    const sourceCanvas = document.createElement("canvas")
    sourceCanvas.width = img.naturalWidth
    sourceCanvas.height = img.naturalHeight
    sourceCanvas.getContext("2d")!.drawImage(img, 0, 0)

    sourceCanvasRef.current = sourceCanvas
    bgRemovedCanvasRef.current = null
    customSizeRef.current = null
    historyRef.current = []
    historyIdxRef.current = -1

    const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === "one-inch")!
    const preview = autoCropToTemplate(sourceCanvas, template)

    const newState: IdPhotoState = {
      ...initialState,
      sourceImage: img,
      sourceFileName: file.name,
      processedCanvas: preview,
      selectedSizeId: "one-inch",
    }
    setState(newState)
    pushHistory(newState)
  }, [pushHistory])

  /** 抠图去背景 */
  const removeBg = useCallback(async () => {
    if (!sourceCanvasRef.current) return
    setState((prev) => ({ ...prev, isProcessing: true, processingMessage: "正在智能抠图，请稍候..." }))

    try {
      const blob = await removeImageBackground(sourceCanvasRef.current)
      const url = URL.createObjectURL(blob)
      const img = await loadImageElement(url)
      URL.revokeObjectURL(url)

      const canvas = document.createElement("canvas")
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext("2d")!.drawImage(img, 0, 0)

      const bgColor = getBgColor(state.selectedBgColor, state.customBgColor)
      let withBg: HTMLCanvasElement
      if (state.selectedBgColor === "blur") {
        withBg = await applyBlurBackground(sourceCanvasRef.current, blob, state.blurLevel, canvas.width, canvas.height)
      } else {
        withBg = await applyBackgroundColor(blob, bgColor, canvas.width, canvas.height)
      }
      bgRemovedCanvasRef.current = withBg

      const size = getTemplateSize(state.selectedSizeId) ?? { widthPx: 295, heightPx: 413 }
      const preview = autoCropToTemplate(withBg, size)

      const newState = {
        isProcessing: false,
        processingMessage: "",
        bgRemoved: true,
        transparentBlob: blob,
        processedCanvas: applyPixelAdjustments(preview, state.brightness, state.contrast, state.saturation, state.smoothLevel, state.whiteningLevel, state.sharpenLevel, state.vignetteRepair),
      }
      setState((prev) => ({ ...prev, ...newState }))
    } catch {
      setState((prev) => ({ ...prev, isProcessing: false, processingMessage: "抠图失败，请重试" }))
    }
  }, [state.selectedBgColor, state.customBgColor, state.selectedSizeId, state.blurLevel, state.brightness, state.contrast, state.saturation, state.smoothLevel, state.whiteningLevel, state.sharpenLevel, state.vignetteRepair, getTemplateSize])

  /** 设置背景色/模糊 */
  const setBgColor = useCallback(
    async (preset: BgColorPreset, customColor?: string) => {
      const base = getBaseCanvas()
      if (!base) return

      const newCustomBg = customColor ?? state.customBgColor
      const updates: Partial<IdPhotoState> = { selectedBgColor: preset, customBgColor: newCustomBg }

      if (!bgRemovedCanvasRef.current || !state.transparentBlob) {
        setState((prev) => ({ ...prev, ...updates }))
        return
      }

      let withBg: HTMLCanvasElement
      if (preset === "blur") {
        withBg = await applyBlurBackground(sourceCanvasRef.current!, state.transparentBlob, state.blurLevel, base.width, base.height)
      } else {
        const bgColor = getBgColor(preset, newCustomBg)
        withBg = await applyBackgroundColor(state.transparentBlob, bgColor, base.width, base.height)
      }
      bgRemovedCanvasRef.current = withBg

      const size = getTemplateSize(state.selectedSizeId) ?? { widthPx: 295, heightPx: 413 }
      const preview = autoCropToTemplate(withBg, size)

      setState((prev) => {
        const newState = { ...prev, ...updates, processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel, prev.sharpenLevel, prev.vignetteRepair) }
        pushHistory(newState)
        return newState
      })
    },
    [getBaseCanvas, state.transparentBlob, state.selectedSizeId, state.customBgColor, state.blurLevel, getTemplateSize, pushHistory],
  )

  /** 设置模糊强度 */
  const setBlurLevel = useCallback(async (level: number) => {
    if (!bgRemovedCanvasRef.current || !state.transparentBlob || state.selectedBgColor !== "blur") return
    const base = getBaseCanvas()
    if (!base) return

    const withBg = await applyBlurBackground(sourceCanvasRef.current!, state.transparentBlob, level, base.width, base.height)
    bgRemovedCanvasRef.current = withBg

    const size = getTemplateSize(state.selectedSizeId) ?? { widthPx: 295, heightPx: 413 }
    const preview = autoCropToTemplate(withBg, size)

    setState((prev) => {
      const newState = { ...prev, blurLevel: level, processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel, prev.sharpenLevel, prev.vignetteRepair) }
      pushHistory(newState)
      return newState
    })
  }, [getBaseCanvas, state.transparentBlob, state.selectedBgColor, state.selectedSizeId, getTemplateSize, pushHistory])

  /** 按模板/自定义尺寸裁剪 */
  const setPhotoSize = useCallback(
    (templateId: string) => {
      const size = getTemplateSize(templateId)
      const base = getBaseCanvas()
      if (!size || !base) return

      const preview = autoCropToTemplate(base, size)
      setState((prev) => {
        const newState = { ...prev, selectedSizeId: templateId, processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel, prev.sharpenLevel, prev.vignetteRepair) }
        pushHistory(newState)
        return newState
      })
    },
    [getBaseCanvas, getTemplateSize, pushHistory],
  )

  /** 设置自定义尺寸 */
  const setCustomSize = useCallback((size: CustomSize) => {
    customSizeRef.current = size
    const base = getBaseCanvas()
    if (!base) return

    const preview = autoCropToTemplate(base, size)
    setState((prev) => {
      const newState = { ...prev, selectedSizeId: "custom", processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel, prev.sharpenLevel, prev.vignetteRepair) }
      pushHistory(newState)
      return newState
    })
  }, [getBaseCanvas, pushHistory])

  /** 防抖应用所有像素级调整 */
  const debouncedApply = useCallback(
    (updates: Partial<IdPhotoState>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const base = getBaseCanvas()
        if (!base) return
        const size = getTemplateSize(updates.selectedSizeId ?? state.selectedSizeId)
        if (!size) return
        const cropped = autoCropToTemplate(base, size)
        const b = updates.brightness ?? state.brightness
        const c = updates.contrast ?? state.contrast
        const s = updates.saturation ?? state.saturation
        const sm = updates.smoothLevel ?? state.smoothLevel
        const w = updates.whiteningLevel ?? state.whiteningLevel
        const sh = updates.sharpenLevel ?? state.sharpenLevel
        const v = updates.vignetteRepair ?? state.vignetteRepair
        const canvas = applyPixelAdjustments(cropped, b, c, s, sm, w, sh, v)
        setState((prev) => {
          const newState = { ...prev, ...updates, processedCanvas: canvas }
          pushHistory(newState)
          return newState
        })
      }, 150)
    },
    [getBaseCanvas, getTemplateSize, state, pushHistory],
  )

  /** 撤销 */
  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    const snap = historyRef.current[historyIdxRef.current]
    applySnapshot(snap)
  }, [getBaseCanvas, getTemplateSize])

  /** 重做 */
  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    const snap = historyRef.current[historyIdxRef.current]
    applySnapshot(snap)
  }, [getBaseCanvas, getTemplateSize])

  function applySnapshot(snap: HistorySnapshot) {
    const base = getBaseCanvas()
    if (!base) return
    const size = getTemplateSize(snap.selectedSizeId)
    if (!size) return

    // 如果是自定义尺寸，恢复 ref
    if (snap.selectedSizeId === "custom" && snap.customSize) {
      customSizeRef.current = snap.customSize
    }

    const cropped = autoCropToTemplate(base, size)
    const canvas = applyPixelAdjustments(cropped, snap.brightness, snap.contrast, snap.saturation, snap.smoothLevel, snap.whiteningLevel, snap.sharpenLevel, snap.vignetteRepair)

    setState((prev) => ({
      ...prev,
      ...snap,
      processedCanvas: canvas,
    }))
  }

  /** 运行人脸检测 + 合规检测 */
  const runFaceDetection = useCallback(async () => {
    const base = getBaseCanvas()
    if (!base) return

    setState((prev) => ({ ...prev, isProcessing: true, processingMessage: "正在检测人脸..." }))
    try {
      const face = await detectFace(base)
      const size = getTemplateSize(state.selectedSizeId)
      const template = size
        ? { id: state.selectedSizeId, name: "", widthPx: size.widthPx, heightPx: size.heightPx, widthMm: 0, heightMm: 0, dpi: 300 }
        : PHOTO_SIZE_TEMPLATES[0]
      const results = state.processedCanvas
        ? checkCompliance(state.processedCanvas, face, template)
        : []

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        processingMessage: "",
        faceDetection: face,
        complianceResults: results,
      }))
    } catch {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        processingMessage: "",
        complianceResults: [{ rule: "人脸检测", passed: false, message: "人脸检测失败", severity: "error" }],
      }))
    }
  }, [getBaseCanvas, state.selectedSizeId, state.processedCanvas, getTemplateSize])

  const setComplianceResults = useCallback((results: ComplianceCheckResult[]) => {
    setState((prev) => ({ ...prev, complianceResults: results }))
  }, [])

  const canUndo = historyIdxRef.current > 0
  const canRedo = historyIdxRef.current < historyRef.current.length - 1

  return {
    state,
    update: useCallback(<K extends keyof IdPhotoState>(key: K, value: IdPhotoState[K]) => {
      setState((prev) => ({ ...prev, [key]: value }))
    }, []),
    sourceCanvasRef,
    loadImage,
    removeBg,
    setBgColor,
    setBlurLevel,
    setPhotoSize,
    setCustomSize,
    debouncedApply,
    runFaceDetection,
    setComplianceResults,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}

function getBgColor(preset: BgColorPreset, custom: string): string {
  if (preset === "custom") return custom
  return BG_COLOR_PRESETS.find((p) => p.id === preset)?.color ?? "#438edb"
}

function applyPixelAdjustments(
  canvas: HTMLCanvasElement,
  brightness: number,
  contrast: number,
  saturation: number,
  smoothLevel: number = 0,
  whiteningLevel: number = 0,
  sharpenLevel: number = 0,
  vignetteRepair: number = 0,
): HTMLCanvasElement {
  const needsWork = brightness !== 0 || contrast !== 0 || saturation !== 0 ||
    smoothLevel > 0 || whiteningLevel > 0 || sharpenLevel > 0 || vignetteRepair > 0
  if (!needsWork) return canvas

  let imageData = canvasToImageData(canvas)
  if (brightness !== 0) imageData = adjustBrightness(imageData, brightness)
  if (contrast !== 0) imageData = adjustContrast(imageData, contrast)
  if (saturation !== 0) imageData = adjustSaturation(imageData, saturation)
  if (sharpenLevel > 0) imageData = adjustSharpen(imageData, sharpenLevel)
  if (vignetteRepair > 0) imageData = repairVignette(imageData, vignetteRepair)
  if (smoothLevel > 0) imageData = skinSmooth(imageData, smoothLevel)
  if (whiteningLevel > 0) imageData = skinWhitening(imageData, whiteningLevel)
  return imageDataToCanvas(imageData)
}

function autoCropToTemplate(
  source: HTMLCanvasElement,
  template: { widthPx: number; heightPx: number },
): HTMLCanvasElement {
  const srcW = source.width
  const srcH = source.height
  const targetRatio = template.widthPx / template.heightPx
  const srcRatio = srcW / srcH

  let cropW: number, cropH: number, cropX: number, cropY: number
  if (srcRatio > targetRatio) {
    cropH = srcH
    cropW = srcH * targetRatio
    cropX = (srcW - cropW) / 2
    cropY = 0
  } else {
    cropW = srcW
    cropH = srcW / targetRatio
    cropX = 0
    cropY = (srcH - cropH) / 2
  }

  const cropped = cropImage(source, {
    x: Math.round(cropX),
    y: Math.round(cropY),
    w: Math.round(cropW),
    h: Math.round(cropH),
  })
  return resizeImage(cropped, template.widthPx, template.heightPx)
}
