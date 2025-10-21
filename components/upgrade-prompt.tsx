"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Zap, ArrowRight } from "lucide-react"
import Link from "next/link"

interface UpgradePromptProps {
  trigger?: "usage_limit" | "model_access" | "general"
  message?: string
}

export function UpgradePrompt({ trigger = "general", message }: UpgradePromptProps) {
  const [profile, setProfile] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const checkProfile = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase.from("profiles").select("subscription_tier").eq("id", user.id).single()

        setProfile(profile)
        setShow(profile?.subscription_tier === "free")
      }
    }

    checkProfile()
  }, [])

  if (!show || !profile) return null

  const getPromptContent = () => {
    switch (trigger) {
      case "usage_limit":
        return {
          title: "Usage Limit Reached",
          description: message || "You've reached your daily query limit. Upgrade to continue using CompareLabs.ai.",
          cta: "Upgrade Now",
        }
      case "model_access":
        return {
          title: "Premium Models Available",
          description: message || "Unlock access to all AI models including Gemini with a paid plan.",
          cta: "View Plans",
        }
      default:
        return {
          title: "Unlock More Features",
          description: "Get more queries, access to all models, and priority support.",
          cta: "Upgrade Plan",
        }
    }
  }

  const content = getPromptContent()

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">{content.title}</CardTitle>
          </div>
          <Badge variant="secondary">Free Plan</Badge>
        </div>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <Button asChild size="sm">
            <Link href="/pricing">
              {content.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShow(false)}>
            Maybe Later
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
