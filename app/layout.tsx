import type { Metadata } from "next"
import { Noto_Sans_SC, Geist_Mono } from "next/font/google"
import Link from "next/link"
import type { ReactNode } from "react"

import "./globals.css"

const notoSans = Noto_Sans_SC({ subsets: ["latin", "latin-ext"], variable: "--font-geist-sans", weight: ["400", "500", "600", "700"] })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: "本地 AI 模型库",
  description: "搜索本地模型文件、硬件兼容性、部署方案、公开排行榜分数和实测速度数据。",
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} ${geistMono.variable}`}>
        <header className="site-header">
          <Link className="wordmark" href="/">
            <svg aria-hidden="true" className="wordmark-mark" fill="none" viewBox="0 0 30 30">
              <rect height="21" rx="4.5" stroke="currentColor" strokeWidth="1.6" width="21" x="4.5" y="4.5" />
              <path d="M9.5 4.5V2.2M15 4.5V2.2M20.5 4.5V2.2M9.5 27.8v-2.3M15 27.8v-2.3M20.5 27.8v-2.3M4.5 9.5H2.2M4.5 15H2.2M4.5 20.5H2.2M27.8 9.5h-2.3M27.8 15h-2.3M27.8 20.5h-2.3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
              <circle cx="15" cy="15" fill="currentColor" r="2.6" />
              <path d="M15 10.2v2.2M15 17.6v2.2M10.2 15h2.2M17.6 15h2.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            </svg>
            <span>本地 AI 模型库</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/compare">对比</Link>
            <Link href="/api/v1">API</Link>
            <a href="https://github.com/gandli/local-ai-registry-zh">源码</a>
          </nav>
        </header>
        {children}
        <footer>
          <p>数据按原始内容显示，未知字段保持未知。</p>
          <a href="/api/v1/index">数据索引</a>
        </footer>
      </body>
    </html>
  )
}
