"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, Star, Sparkles } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Free",
    price: 0,
    description: "Start exploring AI models",
    icon: Sparkles,
    credits: "500 credits/month",
    priceId: "",
    features: [
      "Ask any model",
      "Credits refresh every month",
      "Top models – 25 credits",
      "Medium models – 5 credits",
      "Quick models – 1 credit",
    ],
    examples: ["~20 answers from Top models", "~100 answers from Medium models", "~500 answers from Quick models"],
    popular: false,
    tier: "free" as const,
  },
  {
    name: "Plus",
    price: 9.99,
    description: "Perfect for individuals exploring AI",
    icon: Zap,
    credits: "10,000 credits/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID || "",
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
    popular: true,
    tier: "plus" as const,
  },
  {
    name: "Pro",
    price: 29.99,
    description: "Best for power users and teams",
    icon: Star,
    credits: "30,000 credits/month",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "",
    features: [
      "Everything in Plus, plus 3× more credits",
      "Priority support and early access",
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
    popular: false,
    tier: "pro" as const,
  },
]

export function PlanSelectionCards({ userId }: { userId: string | null }) {
  const handleCheckout = async (tier: string, priceId: string) => {
    if (!userId) {
      window.location.href = "/auth/login"
      return
    }

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          tier,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Error creating checkout:", error)
    }
  }

  return (
    <div className="grid gap-6 sm:gap-7 md:gap-8 grid-cols-1 md:grid-cols-3 max-w-6xl mx-auto mb-12 sm:mb-14 md:mb-16">
      {plans.map((plan) => (
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
              {plan.price === 0 ? (
                <span className="text-4xl font-bold">Free</span>
              ) : (
                <>
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </>
              )}
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

            <div className="mt-6">
              {plan.tier === "free" ? (
                <Button asChild className="w-full bg-transparent" variant="outline">
                  <Link href="/dashboard">Continue with Free</Link>
                </Button>
              ) : (
                <Button className="w-full" onClick={() => handleCheckout(plan.tier, plan.priceId)}>
                  Get {plan.name}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
