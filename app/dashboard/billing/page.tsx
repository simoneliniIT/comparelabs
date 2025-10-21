import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Download, Calendar, DollarSign, Activity } from "lucide-react"
import Link from "next/link"
import { CancelSubscriptionButton } from "@/components/billing/cancel-subscription-button"
import { createPaymentLinkUrl } from "@/lib/stripe"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div>Please sign in to view billing information.</div>
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: limits } = await supabase
    .from("subscription_limits")
    .select("*")
    .eq("tier", profile?.subscription_tier || "free")
    .single()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: monthlyUsage } = await supabase
    .from("usage_logs")
    .select("cost_usd")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString())

  const totalCost = monthlyUsage?.reduce((sum, log) => sum + (log.cost_usd || 0), 0) || 0

  const subscriptionPrices = {
    free: 0,
    plus: 9.99,
    pro: 29.99,
  }

  const creditLimits = {
    free: 500,
    plus: 10000,
    pro: 30000,
  }

  const currentPrice = subscriptionPrices[profile?.subscription_tier as keyof typeof subscriptionPrices] || 0
  const creditLimit = creditLimits[profile?.subscription_tier as keyof typeof creditLimits] || 0

  const plusPaymentLink = createPaymentLinkUrl("plus", user.email || undefined)
  const proPaymentLink = createPaymentLinkUrl("pro", user.email || undefined)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and view billing information.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.subscription_tier}</div>
            <Badge variant={profile?.subscription_status === "active" ? "default" : "destructive"}>
              {profile?.subscription_status === "cancel_at_period_end" ? "Cancelling" : profile?.subscription_status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${currentPrice}</div>
            <p className="text-xs text-muted-foreground">Base subscription fee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {profile?.subscription_tier === "free"
                ? "N/A"
                : profile?.subscription_status === "cancel_at_period_end"
                  ? "Cancelling"
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {profile?.subscription_tier === "free"
                ? "Free plan"
                : profile?.subscription_status === "cancel_at_period_end"
                  ? "Access until period ends"
                  : "Estimated date"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyUsage?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Queries this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>Your current plan features and limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Available Credits</span>
              <span className="font-medium">{profile?.credits || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly Credit Limit</span>
              <span className="font-medium">{creditLimit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Credits Refresh</span>
              <span className="font-medium">
                {profile?.subscription_tier === "free"
                  ? "N/A"
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Priority Support</span>
              <span className="font-medium">{profile?.subscription_tier === "free" ? "No" : "Yes"}</span>
            </div>

            {profile?.subscription_tier === "free" && (
              <div className="pt-4">
                <Button asChild className="w-full">
                  <Link href="/pricing">Upgrade Plan</Link>
                </Button>
              </div>
            )}

            {profile?.subscription_tier === "plus" && (
              <div className="pt-4 space-y-2">
                <p className="text-sm text-muted-foreground">Want more features?</p>
                <Button asChild className="w-full">
                  <Link href={proPaymentLink} target="_blank">
                    Upgrade to Pro
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your recent billing and payment history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profile?.subscription_tier === "free" ? (
                <p className="text-muted-foreground">No billing history for free accounts.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">Monthly Subscription</span>
                      <p className="text-muted-foreground">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">${currentPrice}</span>
                      <Button variant="ghost" size="sm" className="ml-2">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {profile?.subscription_tier !== "free" && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Cancel Subscription</CardTitle>
            <CardDescription>Cancel your subscription and downgrade to the free plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Your subscription will remain active until the end of your current billing period. You'll still have
              access to all features until then.
            </p>
            <CancelSubscriptionButton
              stripeSubscriptionId={profile?.stripe_subscription_id}
              currentTier={profile?.subscription_tier}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
