"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Zap, CreditCard, ArrowUpCircle } from "lucide-react"
import Link from "next/link"
import { useTopics } from "@/lib/contexts/topics-context"
import { ConversationHistory } from "@/components/conversation-history"
import { useEffect, useState } from "react"

interface DashboardContentProps {
  user: any
  profile: any
  totalQueries: number
  limits: any
  usageStats: any[]
  usagePercentage: number
}

export function DashboardContent({
  user,
  profile,
  totalQueries,
  limits,
  usageStats,
  usagePercentage,
}: DashboardContentProps) {
  const { currentTopicId, currentTopicMessages, isLoadingMessages, topics } = useTopics()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="space-y-8 max-w-full">
        <div className="max-w-full">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">
            Welcome back, {profile?.full_name || user?.email}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const currentTopic = topics.find((topic) => topic.id === currentTopicId)
  const shouldShowConversationHistory = currentTopicId !== null && currentTopicId !== undefined && currentTopicId !== ""

  if (shouldShowConversationHistory) {
    return (
      <div className="space-y-6 sm:space-y-8 max-w-full">
        <div className="max-w-full">
          <h1 className="text-2xl sm:text-3xl font-bold break-words">Conversation History</h1>
          <p className="text-sm sm:text-base text-muted-foreground break-words">
            {currentTopic?.title || "Selected conversation"}
          </p>
        </div>

        <ConversationHistory
          key={currentTopicId}
          messages={currentTopicMessages || []}
          isLoading={isLoadingMessages}
          topicTitle={currentTopic?.title}
        />

        <div className="mt-6 sm:mt-8">
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/compare?topic=${currentTopicId}`}>Continue this conversation</Link>
          </Button>
        </div>
      </div>
    )
  }

  const shouldShowUpgrade = profile?.subscription_tier === "free" || profile?.subscription_tier === "plus"
  const upgradeMessage =
    profile?.subscription_tier === "free"
      ? "Unlock unlimited queries and all AI models"
      : "Upgrade to Pro for unlimited queries and priority support"

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full">
      <div className="max-w-full">
        <h1 className="text-2xl sm:text-3xl font-bold break-words">
          Welcome back, {profile?.full_name || user?.email}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground break-words">
          Here's an overview of your CompareLabs.ai usage and account status.
        </p>
      </div>

      {shouldShowUpgrade && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/20 shrink-0">
                <ArrowUpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base sm:text-lg break-words">
                  {profile?.subscription_tier === "free" ? "Upgrade Your Plan" : "Upgrade to Pro"}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{upgradeMessage}</p>
              </div>
            </div>
            <Button asChild size="lg" className="shrink-0 w-full sm:w-auto">
              <Link href="/pricing">
                View Plans
                <ArrowUpCircle className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{profile?.subscription_tier}</div>
            <Badge variant={profile?.subscription_status === "active" ? "default" : "destructive"}>
              {profile?.subscription_status}
            </Badge>
          </CardContent>
        </Card>

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
            <CardTitle className="text-sm font-medium">Comparisons This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQueries || 0}</div>
            <p className="text-xs text-muted-foreground">Total comparisons</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            <CardDescription className="text-sm">Get started with CompareLabs.ai's powerful features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <Button asChild className="w-full">
              <Link href="/compare">Start Comparing Models</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/settings">Account Settings</Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/dashboard/billing">Manage Billing</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
            <CardDescription className="text-sm">Your latest AI model comparisons</CardDescription>
          </CardHeader>
          <CardContent>
            {usageStats && usageStats.length > 0 ? (
              <div className="space-y-2">
                {usageStats.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
                  >
                    <span className="capitalize truncate">{log.model_name}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {new Date(log.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      at{" "}
                      {new Date(log.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No recent activity. Start comparing models to see your history here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
