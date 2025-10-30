import type React from "react"
import type { Metadata } from "next"

import "./globals.css"

import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google"

// Assign loaders to consts at module scope
const inter = Inter({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

const sourceSerif4 = Source_Serif_4({
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-source-serif-4",
})

export const metadata: Metadata = {
  title: "MetaLLM - Compare AI Models Side by Side",
  description: "Get the best answer from every AI model. Compare ChatGPT, Claude, and Gemini responses in real-time.",
    generator: 'v0.app'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif4.variable} antialiased`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  )
}
