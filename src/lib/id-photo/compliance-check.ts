import type { FaceDetectionResult, PhotoSizeTemplate, ComplianceCheckResult } from "@/types/id-photo"

/** 运行合规检测 */
export function checkCompliance(
  canvas: HTMLCanvasElement,
  face: FaceDetectionResult | null,
  template: PhotoSizeTemplate,
): ComplianceCheckResult[] {
  const results: ComplianceCheckResult[] = []

  // 1. 像素尺寸
  const sizeMatch = canvas.width === template.widthPx && canvas.height === template.heightPx
  results.push({
    rule: "像素尺寸",
    passed: sizeMatch,
    message: sizeMatch
      ? `${canvas.width}×${canvas.height}px，符合要求`
      : `当前 ${canvas.width}×${canvas.height}px，要求 ${template.widthPx}×${template.heightPx}px`,
    severity: "error",
  })

  // 2. 宽高比
  const actualRatio = canvas.width / canvas.height
  const targetRatio = template.widthPx / template.heightPx
  const ratioDiff = Math.abs(actualRatio - targetRatio)
  results.push({
    rule: "宽高比",
    passed: ratioDiff < 0.02,
    message: ratioDiff < 0.02
      ? `宽高比 ${actualRatio.toFixed(2)} 正常`
      : `宽高比偏差较大（${ratioDiff.toFixed(2)}）`,
    severity: ratioDiff < 0.05 ? "warning" : "error",
  })

  if (face) {
    // 3. 头身比（人脸高度应占照片高度的 2/3 左右）
    const faceRatio = face.height / canvas.height
    const headRatioOk = faceRatio >= 0.5 && faceRatio <= 0.8
    results.push({
      rule: "头身比例",
      passed: headRatioOk,
      message: headRatioOk
        ? `头部占比 ${(faceRatio * 100).toFixed(0)}%，正常`
        : `头部占比 ${(faceRatio * 100).toFixed(0)}%，建议 50%~80%`,
      severity: faceRatio < 0.4 || faceRatio > 0.9 ? "error" : "warning",
    })

    // 4. 水平居中
    const faceCenterX = face.x + face.width / 2
    const canvasCenterX = canvas.width / 2
    const centerOffset = Math.abs(faceCenterX - canvasCenterX) / canvas.width
    const centeredOk = centerOffset < 0.05
    results.push({
      rule: "水平居中",
      passed: centeredOk,
      message: centeredOk
        ? "人脸水平居中"
        : `人脸偏离中心 ${(centerOffset * 100).toFixed(1)}%`,
      severity: centerOffset > 0.1 ? "error" : "warning",
    })

    // 5. 头顶留白（应在 10%~15%）
    const topMargin = face.y / canvas.height
    const topMarginOk = topMargin >= 0.05 && topMargin <= 0.2
    results.push({
      rule: "头顶留白",
      passed: topMarginOk,
      message: topMarginOk
        ? `头顶留白 ${(topMargin * 100).toFixed(0)}%，正常`
        : `头顶留白 ${(topMargin * 100).toFixed(0)}%，建议 5%~20%`,
      severity: topMargin < 0.02 || topMargin > 0.3 ? "error" : "warning",
    })

    // 6. 人脸置信度
    results.push({
      rule: "人脸检测",
      passed: face.confidence > 0.7,
      message: face.confidence > 0.7
        ? `人脸置信度 ${(face.confidence * 100).toFixed(0)}%`
        : `人脸置信度较低（${(face.confidence * 100).toFixed(0)}%）`,
      severity: face.confidence > 0.5 ? "warning" : "error",
    })
  } else {
    results.push({
      rule: "人脸检测",
      passed: false,
      message: "未检测到人脸",
      severity: "error",
    })
  }

  return results
}
