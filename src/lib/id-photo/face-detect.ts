import * as faceapi from "face-api.js"
import type { FaceDetectionResult } from "@/types/id-photo"

let modelsLoaded = false
let loadingPromise: Promise<void> | null = null

/** 加载人脸检测模型（幂等，只加载一次） */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models/face-api")
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models/face-api")
    modelsLoaded = true
  })()

  return loadingPromise
}

/** 检测单张图片中的人脸 */
export async function detectFace(
  input: HTMLCanvasElement | HTMLImageElement,
): Promise<FaceDetectionResult | null> {
  await loadFaceModels()

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()

  if (!detection) return null

  const box = detection.detection.box
  const points = detection.landmarks.positions

  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    landmarks: points.map((p) => ({ x: p.x, y: p.y })),
    confidence: detection.detection.score,
  }
}
