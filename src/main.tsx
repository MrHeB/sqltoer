import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./index.css"

const router = createBrowserRouter([
  {
    path: "/",
    lazy: async () => {
      const { RootLayout } = await import("./routes/layout")
      return { Component: RootLayout }
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { HomePage } = await import("./routes/home")
          return { Component: HomePage }
        },
      },
      {
        path: "sql-to-er",
        lazy: async () => {
          const { SqlToErPage } = await import("./routes/sql-to-er")
          return { Component: SqlToErPage }
        },
      },
      {
        path: "pdf-watermark",
        lazy: async () => {
          const { PdfWatermarkPage } = await import("./routes/pdf-watermark")
          return { Component: PdfWatermarkPage }
        },
      },
      {
        path: "pdf-remove-watermark",
        lazy: async () => {
          const { PdfRemoveWatermarkPage } = await import("./routes/pdf-remove-watermark")
          return { Component: PdfRemoveWatermarkPage }
        },
      },
      {
        path: "id-photo",
        lazy: async () => {
          const { IdPhotoPage } = await import("./routes/id-photo")
          return { Component: IdPhotoPage }
        },
      },
      {
        path: "color-tool",
        lazy: async () => {
          const { ColorToolPage } = await import("./routes/color-tool")
          return { Component: ColorToolPage }
        },
      },
      {
        path: "encoding",
        lazy: async () => {
          const { EncodingPage } = await import("./routes/encoding")
          return { Component: EncodingPage }
        },
      },
      {
        path: "api-debugger",
        lazy: async () => {
          const { ApiDebuggerPage } = await import("./routes/api-debugger")
          return { Component: ApiDebuggerPage }
        },
      },
      {
        path: "pdf-merge",
        lazy: async () => {
          const { PdfMergePage } = await import("./routes/pdf-merge")
          return { Component: PdfMergePage }
        },
      },
      {
        path: "db-designer",
        lazy: async () => {
          const { DbDesignerPage } = await import("./routes/db-designer")
          return { Component: DbDesignerPage }
        },
      },
      {
        path: "qrcode-tool",
        lazy: async () => {
          const { QrcodeToolPage } = await import("./routes/qrcode-tool")
          return { Component: QrcodeToolPage }
        },
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </StrictMode>
)
