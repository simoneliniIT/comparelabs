"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Coins, AlertTriangle } from "lucide-react"

interface UsageStats {
  credits: number
  maxCredits: number
  tier: string
}

export function UsageIndicator() {
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsage = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      try {
        console.log("[v0] Fetching credits data for user:", user.id)

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("credits, subscription_tier")
          .eq("id", user.id)
          .single()

        if (error) {
          console.error("[v0] Credits query error:", error.message)
          throw error
        }

        console.log("[v0] Profile data:", profile)

        const maxCredits =
          profile?.subscription_tier === "pro" ? 30000 : profile?.subscription_tier === "plus" ? 10000 : 500

        setUsage({
          credits: profile?.credits || 0,
          maxCredits,
          tier: profile?.subscription_tier || "free",
        })
      } catch (error) {
        console.error("[v0] Failed to fetch usage:", error)
        setUsage({
          credits: 0,
          maxCredits: 500,
          tier: "free",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [])

  if (loading || !usage) {
    return null
  }

  const creditsPercentage = (usage.credits / usage.maxCredits) * 100
  const isLowCredits = creditsPercentage < 20

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span className="font-medium">Credits</span>
          </div>
          <Badge variant={usage.tier === "free" ? "secondary" : "default"} className="capitalize">
            {usage.tier}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Available Credits</span>
              <span>
                {usage.credits} / {usage.maxCredits}
              </span>
            </div>
            <Progress value={creditsPercentage} className="h-2" />
          </div>

          {isLowCredits && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <span>Low credits remaining</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>• Top models: 25 credits per answer</p>
            <p>• Medium models: 5 credits per answer</p>
            <p>• Quick models: 1 credit per answer</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
