import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Clock, Zap } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function UsagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please sign in to view usage statistics.</div>
  }

  // Get user profile and limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, credits")
    .eq("id", user.id)
    .single()

  const { data: limits } = await supabase
    .from("subscription_limits")
    .select("*")
    .eq("tier", profile?.subscription_tier || "free")
    .single()

  // Get usage statistics
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // Monthly usage
  const { data: monthlyUsage, count: monthlyCount } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString())

  // Recent usage (last 10 queries)
  const { data: recentUsage } = await supabase
    .from("usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Usage by model this month
  const { data: modelUsage } = await supabase
    .from("usage_logs")
    .select("model_name")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString())

  const modelCounts =
    modelUsage?.reduce((acc: Record<string, number>, log) => {
      acc[log.model_name] = (acc[log.model_name] || 0) + 1
      return acc
    }, {}) || {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Usage Statistics</h1>
        <p className="text-muted-foreground">Track your API usage and monitor your subscription limits.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credits</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile?.credits || 0}</div>
            <p className="text-xs text-muted-foreground">Credits remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCount || 0}</div>
            <p className="text-xs text-muted-foreground">Comparisons this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.subscription_tier}</div>
            <p className="text-xs text-muted-foreground">Current plan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Query</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentUsage?.[0] ? new Date(recentUsage[0].created_at).toLocaleDateString() : "Never"}
            </div>
            <p className="text-xs text-muted-foreground">{recentUsage?.[0]?.model_name || "No recent activity"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage by Model</CardTitle>
            <CardDescription>Your usage breakdown by AI model this month</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(modelCounts).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(modelCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([model, count]) => (
                    <div key={model} className="flex items-center justify-between">
                      <span className="capitalize font-medium">{model}</span>
                      <Badge variant="secondary">{count} queries</Badge>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No usage data for this month.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest AI model queries</CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsage && recentUsage.length > 0 ? (
              <div className="space-y-3">
                {recentUsage.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="capitalize font-medium">{log.model_name}</span>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        at{" "}
                        {new Date(log.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No recent activity. Start comparing models to see your history here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
