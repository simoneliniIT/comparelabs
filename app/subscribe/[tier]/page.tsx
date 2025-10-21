"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

const planDetails = {
  starter: {
    name: "Starter",
    price: 9.99,
    features: [
      "50 daily queries",
      "500 monthly queries",
      "Access to all 3 models",
      "Priority support",
      "Advanced analytics",
      "Export results",
      "API access",
    ],
  },
  pro: {
    name: "Pro",
    price: 29.99,
    features: [
      "200 daily queries",
      "2000 monthly queries",
      "Access to all models",
      "Priority support",
      "Advanced analytics",
      "Export results",
      "API access",
      "Custom integrations",
      "Team collaboration",
    ],
  },
}

export default function SubscribePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  const tier = params.tier as string
  const plan = planDetails[tier as keyof typeof planDetails]

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
    }
    getUser()
  }, [supabase, router])

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Plan not found</h1>
          <Button asChild>
            <Link href="/pricing">View All Plans</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleSubscribe = async () => {
    if (!user) return

    setLoading(true)
    try {
      // In a real app, this would integrate with Stripe or another payment processor
      // For now, we'll simulate the subscription process

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: tier,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Subscription activated!",
        description: `Welcome to the ${plan.name} plan. You now have access to all features.`,
      })

      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "There was an error processing your subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/pricing">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pricing
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Subscribe to {plan.name}</CardTitle>
            <CardDescription>${plan.price}/month - Billed monthly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <h3 className="font-semibold">What's included:</h3>
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-semibold">
                <span>Monthly subscription</span>
                <span>${plan.price}</span>
              </div>
            </div>

            <Button onClick={handleSubscribe} disabled={loading} className="w-full">
              {loading ? "Processing..." : "Subscribe Now"}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Cancel anytime. By subscribing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
