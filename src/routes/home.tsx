import { Link } from "react-router-dom"
import { GitBranch, Droplets, Eraser, Camera, ArrowRight, Palette, Binary, Send, FileStack, Database, QrCode } from "lucide-react"

const tools = [
  {
    title: "SQL 转 ER 图",
    description: "输入 SQL DDL 语句，自动生成关系模式图或 Chen ER 图，支持导出 PNG/SVG",
    href: "/sql-to-er",
    icon: GitBranch,
  },
  {
    title: "PDF 加水印",
    description: "上传 PDF 文件，自定义文字水印（支持中文），可调透明度、旋转、平铺等参数",
    href: "/pdf-watermark",
    icon: Droplets,
  },
  {
    title: "PDF 去水印",
    description: "自动检测并移除 PDF 中的注释水印和低透明度覆盖层，纯浏览器端处理",
    href: "/pdf-remove-watermark",
    icon: Eraser,
  },
  {
    title: "证件照处理",
    description: "智能抠图换背景、标准尺寸裁剪、排版打印、美颜、合规检测",
    href: "/id-photo",
    icon: Camera,
  },
  {
    title: "PDF 合并拆分",
    description: "多个 PDF 合并、按页拆分、页面旋转/删除/拖拽排序",
    href: "/pdf-merge",
    icon: FileStack,
  },
  {
    title: "数据库设计",
    description: "可视化建表、拖拽连线建关系、导出 DDL SQL 和 ER 图",
    href: "/db-designer",
    icon: Database,
  },
  {
    title: "颜色工具",
    description: "取色器、HEX/RGB/HSL 互转、调色板生成、渐变生成器、WCAG 对比度检测",
    href: "/color-tool",
    icon: Palette,
  },
  {
    title: "API 调试",
    description: "轻量级 HTTP 请求调试工具，支持请求历史、JSON 格式化展示",
    href: "/api-debugger",
    icon: Send,
  },
  {
    title: "编解码",
    description: "Base64、URL、JWT、Hash（SHA）、Unicode、HTML 实体编解码",
    href: "/encoding",
    icon: Binary,
  },
  {
    title: "二维码",
    description: "QR 码生成与扫码、条形码、批量生成、Logo 嵌入",
    href: "/qrcode-tool",
    icon: QrCode,
  },
]

export function HomePage() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">开发工具集</h1>
          <p className="mt-2 text-sm text-muted-foreground">选择一个工具开始使用</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tools.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={href}
              to={href}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="size-4.5 text-primary" />
                </div>
                <h2 className="text-sm font-semibold">{title}</h2>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
              <span className="mt-auto flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                开始使用 <ArrowRight className="size-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
