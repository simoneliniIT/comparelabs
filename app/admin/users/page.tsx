import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, CreditCard, UserCheck, UserX } from "lucide-react"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface UserData {
  id: string
  email: string
  full_name: string | null
  subscription_tier: string
  subscription_status: string | null
  credits: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
  current_period_end: string | null
}

export default async function AdminUsersPage() {
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

  const { data: users } = await adminClient.from("profiles").select("*").order("created_at", { ascending: false })

  // Calculate stats
  const totalUsers = users?.length || 0
  const freeUsers = users?.filter((u) => u.subscription_tier === "free").length || 0
  const plusUsers = users?.filter((u) => u.subscription_tier === "plus").length || 0
  const proUsers = users?.filter((u) => u.subscription_tier === "pro").length || 0
  const activeSubscriptions =
    users?.filter((u) => u.subscription_status === "active" && u.subscription_tier !== "free").length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management (Admin)</h1>
        <p className="text-muted-foreground">View and manage all users and their subscriptions.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Users</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{freeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsers > 0 ? ((freeUsers / totalUsers) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plusUsers + proUsers}</div>
            <p className="text-xs text-muted-foreground">
              Plus: {plusUsers} | Pro: {proUsers}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Currently paying</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Complete list of users with subscription details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users && users.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Subscription</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-right p-2">Credits</th>
                      <th className="text-left p-2">Stripe Customer</th>
                      <th className="text-left p-2">Period End</th>
                      <th className="text-left p-2">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((userData) => (
                      <tr key={userData.id} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <div>
                            <div className="font-medium">{userData.full_name || "No name"}</div>
                            <div className="text-muted-foreground text-xs">{userData.email}</div>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge
                            variant={
                              userData.subscription_tier === "pro"
                                ? "default"
                                : userData.subscription_tier === "plus"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="capitalize"
                          >
                            {userData.subscription_tier}
                          </Badge>
                        </td>
                        <td className="p-2">
                          {userData.subscription_status ? (
                            <Badge
                              variant={userData.subscription_status === "active" ? "default" : "destructive"}
                              className="capitalize"
                            >
                              {userData.subscription_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="text-right p-2 font-mono">{userData.credits.toLocaleString()}</td>
                        <td className="p-2">
                          {userData.stripe_customer_id ? (
                            <a
                              href={`https://dashboard.stripe.com/customers/${userData.stripe_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs font-mono"
                            >
                              {userData.stripe_customer_id.slice(0, 12)}...
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="p-2 text-xs">
                          {userData.current_period_end
                            ? new Date(userData.current_period_end).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {new Date(userData.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground">No users found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
