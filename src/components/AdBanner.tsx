import { useEffect, useRef } from "react"

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

interface AdBannerProps {
  /** AdSense 广告单元 slot ID，留空则使用 Auto Ads 模式 */
  slot?: string
  format?: "auto" | "rectangle" | "horizontal" | "vertical"
  responsive?: boolean
  className?: string
}

export function AdBanner({ slot, format = "auto", responsive = true, className = "" }: AdBannerProps) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      // AdSense script may not be loaded yet
    }
  }, [])

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-5961498185231444"
        {...(slot ? { "data-ad-slot": slot } : {})}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  )
}

/** 在 SPA 路由切换时通知 AdSense 重新扫描页面 */
export function useAdSenseRefresh() {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // ignore
    }
  })
}
