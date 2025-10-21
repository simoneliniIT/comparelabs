import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"
import { getSubscriptionPlan } from "@/lib/subscription-plans"

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("[v0] STRIPE_SECRET_KEY environment variable is not set!")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
})

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[v0] STRIPE_SECRET_KEY is missing")
      return NextResponse.json(
        { error: "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable." },
        { status: 500 },
      )
    }

    console.log("[v0] Starting checkout creation...")

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single()

    const { tier } = await request.json()

    if (!tier || (tier !== "plus" && tier !== "pro")) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 })
    }

    console.log("[v0] Tier requested:", tier)

    const plan = getSubscriptionPlan(tier)
    if (!plan || !plan.stripePriceId) {
      console.error(
        `[v0] Missing price ID for tier: ${tier}. Please update lib/subscription-plans.ts with the correct Stripe price ID.`,
      )
      return NextResponse.json(
        {
          error: `The ${tier} plan is not yet configured. Please add the price ID to lib/subscription-plans.ts`,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Plan found:", plan.name, "Price ID:", plan.stripePriceId)

    if (plan.stripePriceId.startsWith("plink_")) {
      console.error(`[v0] Invalid price ID for tier: ${tier}. Found payment link ID instead: ${plan.stripePriceId}`)
      return NextResponse.json(
        {
          error: `Invalid price configuration for ${tier} plan. Payment link IDs cannot be used here.`,
        },
        { status: 400 },
      )
    }

    console.log(`[v0] Creating Stripe checkout session...`)

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.comparelabs.ai"}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.comparelabs.ai"}/pricing`,
        customer_email: profile?.email || user.email,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          tier: tier,
        },
        allow_promotion_codes: true,
      })

      console.log("[v0] Checkout session created successfully:", session.id)
      return NextResponse.json({ url: session.url })
    } catch (stripeError: any) {
      console.error("[v0] Stripe API error:", stripeError.message)
      if (stripeError.message?.includes("similar object exists in live mode")) {
        return NextResponse.json(
          {
            error: `Price ID mismatch: The ${tier} plan is configured with a LIVE mode price ID, but your app is using TEST mode API keys. Please update your Stripe API keys to LIVE mode.`,
          },
          { status: 400 },
        )
      }
      if (stripeError.message?.includes("similar object exists in test mode")) {
        return NextResponse.json(
          {
            error: `Price ID mismatch: The ${tier} plan is configured with a TEST mode price ID, but your app is using LIVE mode API keys. Please update lib/subscription-plans.ts with LIVE mode price IDs.`,
          },
          { status: 400 },
        )
      }
      return NextResponse.json({ error: `Stripe error: ${stripeError.message}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error("[v0] Unexpected error in checkout creation:", error)
    return NextResponse.json({ error: `Server error: ${error.message || "Unknown error"}` }, { status: 500 })
  }
}
