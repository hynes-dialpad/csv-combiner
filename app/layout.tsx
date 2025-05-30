import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/react"
import { ThemeProvider } from "@/components/theme-provider"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CSV Combinator",
  description:
    "Upload and combine up to 100 CSV files into one downloadable file. Fast, secure, and browser-based processing.",
  keywords: ["CSV", "merge", "combine", "data", "files", "upload"],
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Suspense fallback={<div>Loading...</div>}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <main className="min-h-screen bg-background">{children}</main>
            <Analytics />
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  )
}
