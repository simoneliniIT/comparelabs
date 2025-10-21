import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "@/components/dashboard-content"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single()

  // Get usage stats for current month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: usageStats, count: totalQueries } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact" })
    .eq("user_id", user!.id)
    .gte("created_at", startOfMonth.toISOString())

  // Get subscription limits
  const { data: limits } = await supabase
    .from("subscription_limits")
    .select("*")
    .eq("tier", profile?.subscription_tier || "free")
    .single()

  const usagePercentage =
    limits?.monthly_queries === -1 ? 0 : ((totalQueries || 0) / (limits?.monthly_queries || 1)) * 100

  return (
    <DashboardContent
      user={user}
      profile={profile}
      totalQueries={totalQueries || 0}
      limits={limits}
      usageStats={usageStats || []}
      usagePercentage={usagePercentage}
    />
  )
}
