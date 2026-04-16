import { useState, useRef, useCallback } from "react"
import type { IdPhotoState, BgColorPreset, ComplianceCheckResult } from "@/types/id-photo"
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
} from "@/lib/id-photo/image-operations"
import {
  removeImageBackground,
  applyBackgroundColor,
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
  faceDetection: null,
  complianceResults: [],
  batchFiles: [],
  batchProgress: 0,
}

export function useIdPhoto() {
  const [state, setState] = useState<IdPhotoState>(initialState)
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null)
  const bgRemovedCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const update = useCallback(<K extends keyof IdPhotoState>(key: K, value: IdPhotoState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
  }, [])

  /** 获取处理基准 Canvas（抠图后 or 原图） */
  const getBaseCanvas = useCallback(() => {
    return bgRemovedCanvasRef.current || sourceCanvasRef.current
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
    const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === "one-inch")!
    const preview = autoCropToTemplate(sourceCanvas, template)

    setState({
      ...initialState,
      sourceImage: img,
      sourceFileName: file.name,
      processedCanvas: preview,
      selectedSizeId: "one-inch",
    })
  }, [])

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

      bgRemovedCanvasRef.current = canvas

      // 应用背景色 + 裁剪
      const bgColor = getBgColor(state.selectedBgColor, state.customBgColor)
      const withBg = await applyBackgroundColor(blob, bgColor, canvas.width, canvas.height)
      bgRemovedCanvasRef.current = withBg

      const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === state.selectedSizeId)!
      const preview = autoCropToTemplate(withBg, template)

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        processingMessage: "",
        bgRemoved: true,
        transparentBlob: blob,
        processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel),
      }))
    } catch (e) {
      setState((prev) => ({ ...prev, isProcessing: false, processingMessage: "抠图失败，请重试" }))
    }
  }, [state.selectedBgColor, state.customBgColor, state.selectedSizeId])

  /** 设置背景色 */
  const setBgColor = useCallback(
    async (preset: BgColorPreset, customColor?: string) => {
      const base = getBaseCanvas()
      if (!base) return

      const newCustomBg = customColor ?? state.customBgColor
      setState((prev) => ({
        ...prev,
        selectedBgColor: preset,
        customBgColor: newCustomBg,
      }))

      if (!bgRemovedCanvasRef.current || !state.transparentBlob) return

      const bgColor = getBgColor(preset, newCustomBg)
      const withBg = await applyBackgroundColor(state.transparentBlob, bgColor, base.width, base.height)
      bgRemovedCanvasRef.current = withBg

      const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === state.selectedSizeId)!
      const preview = autoCropToTemplate(withBg, template)

      setState((prev) => ({
        ...prev,
        processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel),
      }))
    },
    [getBaseCanvas, state.transparentBlob, state.selectedSizeId, state.customBgColor],
  )

  /** 按模板自动居中裁剪 */
  const setPhotoSize = useCallback(
    (templateId: string) => {
      const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === templateId)
      const base = getBaseCanvas()
      if (!template || !base) return

      const preview = autoCropToTemplate(base, template)
      setState((prev) => ({ ...prev, selectedSizeId: templateId, processedCanvas: applyPixelAdjustments(preview, prev.brightness, prev.contrast, prev.saturation, prev.smoothLevel, prev.whiteningLevel) }))
    },
    [getBaseCanvas],
  )

  /** 应用调色 */
  const applyAdjustments = useCallback(
    (brightness: number, contrast: number, saturation: number) => {
      const base = getBaseCanvas()
      if (!base) return
      const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === state.selectedSizeId)
      if (!template) return

      let canvas = autoCropToTemplate(base, template)
      canvas = applyPixelAdjustments(canvas, brightness, contrast, saturation, state.smoothLevel, state.whiteningLevel)

      setState((prev) => ({
        ...prev,
        brightness,
        contrast,
        saturation,
        processedCanvas: canvas,
      }))
    },
    [getBaseCanvas, state.selectedSizeId],
  )

  /** 防抖调色 */
  const debouncedAdjust = useCallback(
    (brightness: number, contrast: number, saturation: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        applyAdjustments(brightness, contrast, saturation)
      }, 150)
    },
    [applyAdjustments],
  )

  /** 防抖美颜 */
  const debouncedBeauty = useCallback(
    (smoothLevel: number, whiteningLevel: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const base = getBaseCanvas()
        if (!base) return
        const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === state.selectedSizeId)
        if (!template) return
        const cropped = autoCropToTemplate(base, template)
        const canvas = applyPixelAdjustments(cropped, state.brightness, state.contrast, state.saturation, smoothLevel, whiteningLevel)
        setState((prev) => ({ ...prev, smoothLevel, whiteningLevel, processedCanvas: canvas }))
      }, 150)
    },
    [getBaseCanvas, state.selectedSizeId, state.brightness, state.contrast, state.saturation],
  )

  /** 设置合规检测结果 */
  const setComplianceResults = useCallback((results: ComplianceCheckResult[]) => {
    setState((prev) => ({ ...prev, complianceResults: results }))
  }, [])

  /** 运行人脸检测 + 合规检测 */
  const runFaceDetection = useCallback(async () => {
    const base = getBaseCanvas()
    if (!base) return

    setState((prev) => ({ ...prev, isProcessing: true, processingMessage: "正在检测人脸..." }))
    try {
      const face = await detectFace(base)
      const template = PHOTO_SIZE_TEMPLATES.find((t) => t.id === state.selectedSizeId)!
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
  }, [getBaseCanvas, state.selectedSizeId, state.processedCanvas])

  return {
    state,
    update,
    sourceCanvasRef,
    previewCanvasRef,
    loadImage,
    removeBg,
    setBgColor,
    setPhotoSize,
    applyAdjustments,
    debouncedAdjust,
    debouncedBeauty,
    runFaceDetection,
    setComplianceResults,
  }
}

/** 获取背景色 hex 值 */
function getBgColor(preset: BgColorPreset, custom: string): string {
  if (preset === "custom") return custom
  return BG_COLOR_PRESETS.find((p) => p.id === preset)?.color ?? "#438edb"
}

/** 应用像素级调色 + 美颜 */
function applyPixelAdjustments(
  canvas: HTMLCanvasElement,
  brightness: number,
  contrast: number,
  saturation: number,
  smoothLevel: number = 0,
  whiteningLevel: number = 0,
): HTMLCanvasElement {
  const needsAdjust = brightness !== 0 || contrast !== 0 || saturation !== 0
  const needsBeauty = smoothLevel > 0 || whiteningLevel > 0
  if (!needsAdjust && !needsBeauty) return canvas

  let imageData = canvasToImageData(canvas)
  if (brightness !== 0) imageData = adjustBrightness(imageData, brightness)
  if (contrast !== 0) imageData = adjustContrast(imageData, contrast)
  if (saturation !== 0) imageData = adjustSaturation(imageData, saturation)
  if (smoothLevel > 0) imageData = skinSmooth(imageData, smoothLevel)
  if (whiteningLevel > 0) imageData = skinWhitening(imageData, whiteningLevel)
  return imageDataToCanvas(imageData)
}

/** 根据模板从源图居中裁剪并缩放到精确像素 */
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
