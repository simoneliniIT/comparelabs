import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Users, TrendingUp, Activity } from "lucide-react"
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

  // Calculate totals
  const totalUsers = costAnalytics?.length || 0
  const totalDailyCost = costAnalytics?.reduce((sum, user) => sum + (user.daily_cost_usd || 0), 0) || 0
  const totalMonthlyCost = costAnalytics?.reduce((sum, user) => sum + (user.monthly_cost_usd || 0), 0) || 0
  const totalAllTimeCost = costAnalytics?.reduce((sum, user) => sum + (user.total_cost_usd || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cost Analytics (Admin)</h1>
        <p className="text-muted-foreground">Monitor token usage and costs across all users.</p>
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
            <p className="text-xs text-muted-foreground">Today's API costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">This month's API costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAllTimeCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All-time API costs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Cost Breakdown</CardTitle>
          <CardDescription>Token usage and costs per user (sorted by monthly cost)</CardDescription>
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
                      <th className="text-right p-2">Daily Tokens</th>
                      <th className="text-right p-2">Daily Cost</th>
                      <th className="text-right p-2">Monthly Tokens</th>
                      <th className="text-right p-2">Monthly Cost</th>
                      <th className="text-right p-2">Total Cost</th>
                      <th className="text-left p-2">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costAnalytics.map((user) => (
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
                          <div>{user.daily_total_tokens.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{user.daily_queries} queries</div>
                        </td>
                        <td className="text-right p-2 font-mono">${user.daily_cost_usd.toFixed(4)}</td>
                        <td className="text-right p-2">
                          <div>{user.monthly_total_tokens.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{user.monthly_queries} queries</div>
                        </td>
                        <td className="text-right p-2 font-mono">${user.monthly_cost_usd.toFixed(4)}</td>
                        <td className="text-right p-2 font-mono">${user.total_cost_usd.toFixed(4)}</td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : "Never"}
                        </td>
                      </tr>
                    ))}
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
