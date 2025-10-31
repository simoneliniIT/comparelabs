import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, TrendingUp, Activity, Calendar, Coins } from "lucide-react"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface CostAnalytics {
  user_id: string
  email: string
  full_name: string | null
  subscription_tier: string
  subscription_status: string
  daily_queries: number
  daily_prompt_tokens: number
  daily_completion_tokens: number
  daily_total_tokens: number
  daily_cost_usd: number
  monthly_queries: number
  monthly_prompt_tokens: number
  monthly_completion_tokens: number
  monthly_total_tokens: number
  monthly_cost_usd: number
  total_queries: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_total_tokens: number
  total_cost_usd: number
  last_activity: string | null
}

export default async function AdminCostAnalyticsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: adminUser } = await adminClient.from("admin_users").select("*").eq("email", user.email).single()

  if (!adminUser) {
    redirect("/dashboard")
  }

  // Get cost analytics data
  const { data: costAnalytics } = await supabase
    .from("admin_cost_analytics")
    .select("*")
    .order("monthly_cost_usd", { ascending: false })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: creditTransactions } = await adminClient
    .from("credit_transactions")
    .select("user_id, amount, created_at, transaction_type")
    .eq("transaction_type", "deduction")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })

  // Calculate credit totals by time period
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const creditsByUser = new Map<string, { daily: number; monthly: number; total: number }>()

  creditTransactions?.forEach((tx) => {
    const txDate = new Date(tx.created_at)
    const credits = Math.abs(tx.amount) // Convert negative amounts to positive for display

    if (!creditsByUser.has(tx.user_id)) {
      creditsByUser.set(tx.user_id, { daily: 0, monthly: 0, total: 0 })
    }

    const userCredits = creditsByUser.get(tx.user_id)!

    // Daily (today)
    if (txDate >= today) {
      userCredits.daily += credits
    }

    // Monthly (this month)
    if (txDate >= thisMonth) {
      userCredits.monthly += credits
    }

    // Total (all time)
    userCredits.total += credits
  })

  // Calculate totals
  const totalUsers = costAnalytics?.length || 0
  const totalDailyCost = costAnalytics?.reduce((sum, user) => sum + (user.daily_cost_usd || 0), 0) || 0
  const totalMonthlyCost = costAnalytics?.reduce((sum, user) => sum + (user.monthly_cost_usd || 0), 0) || 0
  const totalAllTimeCost = costAnalytics?.reduce((sum, user) => sum + (user.total_cost_usd || 0), 0) || 0

  const totalDailyCredits = Array.from(creditsByUser.values()).reduce((sum, c) => sum + c.daily, 0)
  const totalMonthlyCredits = Array.from(creditsByUser.values()).reduce((sum, c) => sum + c.monthly, 0)
  const totalAllTimeCredits = Array.from(creditsByUser.values()).reduce((sum, c) => sum + c.total, 0)

  const { data: dailyUsage } = await adminClient
    .from("usage_logs")
    .select("user_id, created_at, cost_usd, model_name, total_tokens")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })

  // Get user profiles for mapping user_id to email/name
  const { data: profiles } = await adminClient.from("profiles").select("id, email, full_name")

  // Create a map of user_id to user info
  const userMap = new Map(profiles?.map((p) => [p.id, { email: p.email, name: p.full_name }]) || [])

  const dailyByUser = new Map<string, Map<string, { cost: number; tokens: number; queries: number; credits: number }>>()

  dailyUsage?.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString()
    if (!dailyByUser.has(date)) {
      dailyByUser.set(date, new Map())
    }
    const dateMap = dailyByUser.get(date)!
    if (!dateMap.has(log.user_id)) {
      dateMap.set(log.user_id, { cost: 0, tokens: 0, queries: 0, credits: 0 })
    }
    const userStats = dateMap.get(log.user_id)!
    userStats.cost += Number(log.cost_usd) || 0
    userStats.tokens += log.total_tokens || 0
    userStats.queries += 1
  })

  // Add credits to daily breakdown
  creditTransactions?.forEach((tx) => {
    const date = new Date(tx.created_at).toLocaleDateString()
    if (dailyByUser.has(date)) {
      const dateMap = dailyByUser.get(date)!
      if (!dateMap.has(tx.user_id)) {
        dateMap.set(tx.user_id, { cost: 0, tokens: 0, queries: 0, credits: 0 })
      }
      const userStats = dateMap.get(tx.user_id)!
      userStats.credits += Math.abs(tx.amount)
    }
  })

  // Convert to array and sort by date (most recent first)
  const dailyBreakdown = Array.from(dailyByUser.entries())
    .map(([date, users]) => ({
      date,
      users: Array.from(users.entries()).map(([userId, stats]) => ({
        userId,
        email: userMap.get(userId)?.email || "Unknown",
        name: userMap.get(userId)?.name || "Unknown",
        ...stats,
      })),
      totalCost: Array.from(users.values()).reduce((sum, u) => sum + u.cost, 0),
      totalQueries: Array.from(users.values()).reduce((sum, u) => sum + u.queries, 0),
      totalCredits: Array.from(users.values()).reduce((sum, u) => sum + u.credits, 0),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cost Analytics (Admin)</h1>
        <p className="text-muted-foreground">Monitor token usage, costs, and credits across all users.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalDailyCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">{totalDailyCredits} credits spent today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{totalMonthlyCredits} credits this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAllTimeCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{totalAllTimeCredits} credits all-time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Daily Credit Spending History</CardTitle>
          </div>
          <CardDescription>Track credit spending by user for each day (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dailyBreakdown && dailyBreakdown.length > 0 ? (
              dailyBreakdown.map((day) => (
                <div key={day.date} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{day.date}</h3>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">{day.totalQueries} queries</span>
                      <span className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {day.totalCredits} credits
                      </span>
                      <span className="font-mono font-semibold">${day.totalCost.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">User</th>
                          <th className="text-right p-2">Queries</th>
                          <th className="text-right p-2">Credits</th>
                          <th className="text-right p-2">Tokens</th>
                          <th className="text-right p-2">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.users
                          .sort((a, b) => b.cost - a.cost)
                          .map((user) => (
                            <tr key={user.userId} className="border-b">
                              <td className="p-2">
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-muted-foreground text-xs">{user.email}</div>
                                </div>
                              </td>
                              <td className="text-right p-2">{user.queries}</td>
                              <td className="text-right p-2 font-semibold">{user.credits}</td>
                              <td className="text-right p-2">{user.tokens.toLocaleString()}</td>
                              <td className="text-right p-2 font-mono">${user.cost.toFixed(4)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">No usage data available for the last 30 days.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Cost Breakdown</CardTitle>
          <CardDescription>Token usage, credits spent, and costs per user (sorted by monthly cost)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {costAnalytics && costAnalytics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Tier</th>
                      <th className="text-right p-2">Daily</th>
                      <th className="text-right p-2">Monthly</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-left p-2">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costAnalytics.map((user) => {
                      const userCredits = creditsByUser.get(user.user_id) || { daily: 0, monthly: 0, total: 0 }
                      return (
                        <tr key={user.user_id} className="border-b">
                          <td className="p-2">
                            <div>
                              <div className="font-medium">{user.full_name || "No name"}</div>
                              <div className="text-muted-foreground text-xs">{user.email}</div>
                            </div>
                          </td>
                          <td className="p-2">
                            <Badge
                              variant={user.subscription_tier === "free" ? "secondary" : "default"}
                              className="capitalize"
                            >
                              {user.subscription_tier}
                            </Badge>
                          </td>
                          <td className="text-right p-2">
                            <div className="font-semibold">{userCredits.daily} credits</div>
                            <div className="text-xs text-muted-foreground">
                              {(user.daily_total_tokens || 0).toLocaleString()} tokens
                            </div>
                            <div className="text-xs font-mono">${(user.daily_cost_usd || 0).toFixed(4)}</div>
                          </td>
                          <td className="text-right p-2">
                            <div className="font-semibold">{userCredits.monthly} credits</div>
                            <div className="text-xs text-muted-foreground">
                              {(user.monthly_total_tokens || 0).toLocaleString()} tokens
                            </div>
                            <div className="text-xs font-mono">${(user.monthly_cost_usd || 0).toFixed(4)}</div>
                          </td>
                          <td className="text-right p-2">
                            <div className="font-semibold">{userCredits.total} credits</div>
                            <div className="text-xs text-muted-foreground">
                              {(user.total_total_tokens || 0).toLocaleString()} tokens
                            </div>
                            <div className="text-xs font-mono">${(user.total_cost_usd || 0).toFixed(4)}</div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : "Never"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No usage data available.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
