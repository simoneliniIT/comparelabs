import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log(`[v0] 🔄 Manual sync requested for email: ${email}`)

    // Get Supabase client
    const supabase = await createClient()

    // Check if requester is admin
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: adminCheck } = await supabase.from("admin_users").select("id").eq("id", user.id).single()

    if (!adminCheck) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Find user in database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, stripe_customer_id, subscription_tier")
      .eq("email", email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: `User not found: ${email}` }, { status: 404 })
    }

    console.log(`[v0] Found user: ${profile.id}, current tier: ${profile.subscription_tier}`)

    // Search for Stripe customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: `No Stripe customer found for email: ${email}` }, { status: 404 })
    }

    const customer = customers.data[0]
    console.log(`[v0] Found Stripe customer: ${customer.id}`)

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        message: `No active subscription found for ${email}. User remains on free tier.`,
        user: profile,
      })
    }

    const subscription = subscriptions.data[0]
    const priceId = subscription.items.data[0]?.price.id
    const priceAmount = subscription.items.data[0]?.price.unit_amount
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    console.log(`[v0] Found subscription: ${subscription.id}`)
    console.log(`[v0] Price ID: ${priceId}`)
    console.log(`[v0] Price amount: ${priceAmount} cents`)

    // Determine tier
    let subscriptionTier = "free"
    if (priceAmount) {
      if (priceAmount >= 2500) {
        subscriptionTier = "pro"
      } else if (priceAmount >= 500) {
        subscriptionTier = "plus"
      }
    }

    // Fallback to env var check
    if (subscriptionTier === "free" && priceId) {
      if (priceId === process.env.STRIPE_PLUS_PRICE_ID) {
        subscriptionTier = "plus"
      } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        subscriptionTier = "pro"
      }
    }

    console.log(`[v0] Determined tier: ${subscriptionTier}`)

    // Update user profile
    const { data: updateResult, error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: subscriptionTier,
        subscription_status: "active",
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select()

    if (updateError) {
      console.error(`[v0] ❌ Update error:`, updateError)
      return NextResponse.json({ error: "Failed to update user profile", details: updateError }, { status: 500 })
    }

    console.log(`[v0] ✅ Successfully synced subscription`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced subscription for ${email}`,
      before: {
        tier: profile.subscription_tier,
      },
      after: {
        tier: subscriptionTier,
        subscription_id: subscription.id,
        customer_id: customer.id,
        period_end: currentPeriodEnd,
      },
      user: updateResult[0],
    })
  } catch (error: any) {
    console.error(`[v0] ❌ Sync error:`, error)
    return NextResponse.json({ error: "Sync failed", details: error.message }, { status: 500 })
  }
}
