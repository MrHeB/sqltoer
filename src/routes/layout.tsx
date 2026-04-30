import { Outlet } from "react-router-dom"
import { TopNavbar } from "@/components/TopNavbar"
import { useAdSenseRefresh } from "@/components/AdBanner"

export function RootLayout() {
  useAdSenseRefresh()

  return (
    <div className="flex h-screen w-screen flex-col">
      <TopNavbar />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
