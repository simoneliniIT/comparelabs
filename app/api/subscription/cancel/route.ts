import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId } = await request.json()

    if (!subscriptionId) {
      return NextResponse.json({ error: "Subscription ID is required" }, { status: 400 })
    }

    console.log("[v0] Cancelling Stripe subscription:", subscriptionId)

    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Verify the subscription belongs to this user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (profile.stripe_subscription_id !== subscriptionId) {
      return NextResponse.json({ error: "Subscription does not belong to this user" }, { status: 403 })
    }

    // Cancel the subscription in Stripe (at period end)
    const cancelledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    console.log("[v0] Stripe subscription cancelled at period end:", cancelledSubscription.id)

    // Update the user's profile to reflect the cancellation
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_status: "cancel_at_period_end",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Error updating user profile:", updateError)
      return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Subscription will be cancelled at the end of the billing period",
      cancelAtPeriodEnd: cancelledSubscription.cancel_at_period_end,
      currentPeriodEnd: new Date(cancelledSubscription.current_period_end * 1000).toISOString(),
    })
  } catch (error) {
    console.error("[v0] Subscription cancellation error:", error)

    if (error instanceof Error && error.message.includes("No such subscription")) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
