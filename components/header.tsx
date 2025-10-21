"use client"

import { UserNav } from "@/components/auth/user-nav"
import Link from "next/link"
import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import Image from "next/image"

export function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data.user)
    })
  }, [])

  const logoHref = isAuthenticated ? "/dashboard" : "/"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white backdrop-blur supports-[backdrop-filter]:bg-white/95 overflow-x-hidden">
      <div className="w-full max-w-full mx-auto flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6 gap-2 sm:gap-4">
        <Link href={logoHref} className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
          <Image
            src="/logo.png"
            alt="CompareLabs.ai"
            width={660}
            height={180}
            className="h-7 sm:h-9 md:h-11 w-auto object-contain max-w-[180px] sm:max-w-[220px] md:max-w-none"
            priority
          />
        </Link>

        <UserNav />
      </div>
    </header>
  )
}
