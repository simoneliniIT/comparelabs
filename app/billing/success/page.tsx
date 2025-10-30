"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CheckCircle, Sparkles, ArrowRight, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function BillingSuccessPage() {
  useEffect(() => {
    // Fire conversion event for Google Ads
    if (typeof window !== "undefined" && (window as any).gtag) {
      ;(window as any).gtag("event", "conversion", {
        send_to: "AW-17659980815",
        value: 1.0,
        currency: "USD",
      })
      console.log("[v0] Google Ads conversion event fired")
    }
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />

      <div className="relative max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <CheckCircle className="h-20 w-20 text-green-500 relative z-10 drop-shadow-lg" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-foreground tracking-tight">
            Welcome to <span className="gradient-text">CompareLabs.ai Pro</span>!
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Your payment was successful and your Pro subscription is now active. You're ready to unlock the full power
            of AI model comparison.
          </p>
        </div>

        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold">Pro Features Unlocked</span>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Unlimited AI model comparisons</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Advanced analytics & insights</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Priority customer support</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Export & sharing capabilities</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Button
            asChild
            size="lg"
            className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              Start Exploring
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Button
            variant="outline"
            asChild
            size="lg"
            className="flex-1 h-12 text-base bg-card/50 backdrop-blur-sm border-border/50 hover:bg-card/80 transition-all duration-200"
          >
            <Link href="/dashboard/billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              View Billing
            </Link>
          </Button>
        </div>

        <div className="pt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            📧 A confirmation email with your receipt has been sent to your inbox
          </p>
          <p className="text-xs text-muted-foreground/80">Need help? Contact our support team anytime</p>
        </div>
      </div>
    </div>
  )
}
