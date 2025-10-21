"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, Star } from "lucide-react"
import { useState } from "react"

const plans = [
  {
    name: "Plus",
    price: 9.99,
    description: "Perfect for individuals exploring AI",
    icon: Zap,
    credits: "10,000 credits/month",
    features: [
      "Ask any model",
      "Credits refresh every month",
      "Top models – 25 credits",
      "Medium models – 5 credits",
      "Quick models – 1 credit",
    ],
    examples: [
      "~400 answers from Top models",
      "~2,000 answers from Medium models",
      "~10,000 answers from Quick models",
    ],
    note: "If you ask the same question to several models, you pay credits for each answer",
    popular: false,
    tier: "plus" as const,
  },
  {
    name: "Pro",
    price: 29.99,
    description: "Best for power users and teams who use AI daily",
    icon: Star,
    credits: "30,000 credits/month",
    features: [
      "Everything in Plus, plus 3× more credits",
      "Priority support and early access to new features",
      "Same simple credit costs:",
      "Top – 25 credits",
      "Medium – 5 credits",
      "Quick – 1 credit",
    ],
    examples: [
      "~1,200 answers from Top models",
      "~6,000 answers from Medium models",
      "~30,000 answers from Quick models",
    ],
    note: "Pay credits per model if you compare answers across several at once",
    popular: true,
    tier: "pro" as const,
  },
]

interface PricingCardsProps {
  userId: string | null
  userTier: string | null
}

export function PricingCards({ userId, userTier }: PricingCardsProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (plan: (typeof plans)[number]) => {
    if (!userId) {
      window.location.href = "/auth/login"
      return
    }

    setLoading(plan.tier)

    try {
      console.log("[v0] Creating checkout for tier:", plan.tier)

      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: plan.tier,
        }),
      })

      const data = await response.json()

      console.log("[v0] Checkout response:", data)

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("[v0] No checkout URL returned. Error:", data.error)
        alert(data.error || "Failed to create checkout session. Please try again.")
        setLoading(null)
      }
    } catch (error) {
      console.error("[v0] Error creating checkout:", error)
      alert("An error occurred. Please try again.")
      setLoading(null)
    }
  }

  return (
    <div className="grid gap-6 sm:gap-7 md:gap-8 grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto mb-12 sm:mb-14 md:mb-16">
      {plans.map((plan) => {
        const isCurrentPlan = userId && userTier === plan.tier

        return (
          <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg md:scale-105" : ""}`}>
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">Most Popular</Badge>
            )}
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <plan.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <div className="mt-2 text-lg font-semibold text-primary">{plan.credits}</div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t space-y-2">
                <p className="text-sm font-medium">💡 With {plan.credits.split(" ")[0]} credits you can get:</p>
                {plan.examples.map((example) => (
                  <div key={example} className="flex items-start gap-2">
                    <span className="text-sm text-muted-foreground">• {example}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground italic">{plan.note}</p>
              </div>

              <div className="mt-6">
                {isCurrentPlan ? (
                  <Button className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => handleCheckout(plan)} disabled={loading === plan.tier}>
                    {loading === plan.tier ? "Loading..." : `Get ${plan.name}`}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
