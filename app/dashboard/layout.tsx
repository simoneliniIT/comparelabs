import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { DashboardNav } from "@/components/dashboard-nav"
import { UsageIndicator } from "@/components/usage-indicator"
import { HistorySidebar } from "@/components/history-sidebar"
import { TopicsProvider } from "@/lib/contexts/topics-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log("[v0] Dashboard layout starting")

  try {
    console.log("[v0] Creating Supabase client")
    const supabase = await createClient()
    console.log("[v0] Supabase client created successfully")

    console.log("[v0] Getting user from Supabase")
    const { data, error } = await supabase.auth.getUser()

    console.log("[v0] User data:", data?.user?.id ? "User found" : "No user")
    console.log("[v0] Auth error:", error?.message || "No error")

    if (error || !data?.user) {
      console.log("[v0] Redirecting to login")
      redirect("/auth/login")
    }

    console.log("[v0] User authenticated, rendering dashboard")
    return (
      <TopicsProvider>
        <div className="min-h-screen bg-background overflow-x-hidden">
          <Header />
          <div className="flex">
            <HistorySidebar />
            <div className="flex-1 max-w-full overflow-x-hidden">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                  <aside className="w-full lg:w-64 shrink-0">
                    <UsageIndicator />
                    <DashboardNav />
                  </aside>
                  <main className="flex-1 min-w-0 max-w-full">{children}</main>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TopicsProvider>
    )
  } catch (err) {
    console.error("[v0] Dashboard layout error:", err)
    throw err
  }
}
