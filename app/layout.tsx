import type React from "react"
import type { Metadata } from "next"
import Script from "next/script"

import "./globals.css"

import { Inter, JetBrains_Mono, Source_Serif_4, Geist as V0_Font_Geist, Geist_Mono as V0_Font_Geist_Mono, Source_Serif_4 as V0_Font_Source_Serif_4 } from 'next/font/google'

// Initialize fonts
const _geist = V0_Font_Geist({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"], variable: '--v0-font-geist' })
const _geistMono = V0_Font_Geist_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"], variable: '--v0-font-geist-mono' })
const _sourceSerif_4 = V0_Font_Source_Serif_4({ subsets: ['latin'], weight: ["200","300","400","500","600","700","800","900"], variable: '--v0-font-source-serif-4' })
const _v0_fontVariables = `${_geist.variable} ${_geistMono.variable} ${_sourceSerif_4.variable}`

const inter = Inter({
  weight: ["100","200","300","400","500","600","700","800","900"],
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  weight: ["100","200","300","400","500","600","700","800"],
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

const sourceSerif4 = Source_Serif_4({
  weight: ["200","300","400","500","600","700","800","900"],
  subsets: ["latin"],
  variable: "--font-source-serif-4",
})

export const metadata: Metadata = {
  title: "CompareLabs.ai - Compare AI Models Side by Side",
  description: "Get the best answer from every AI model. Compare ChatGPT, Claude, and Gemini responses in real-time.",
  icons: {
    icon: "/favicon.ico",
  },
    generator: 'v0.app'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${sourceSerif4.variable} antialiased`}>
      <head>
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="7aa972b6-1ac0-4f62-904a-0d4a1eb97226"
          strategy="beforeInteractive"
        />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-MLM918MGC5" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MLM918MGC5');
          `}
        </Script>
      </head>
      <body className={`min-h-screen bg-background text-foreground font-sans ${_v0_fontVariables}`}>{children}</body>
    </html>
  )
}
