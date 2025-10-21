import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Resetting user account to free tier")

    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error:", authError?.message || "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    // Reset user profile to free tier and clear Stripe data
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: "free",
        subscription_status: "active",
        stripe_customer_id: null,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Error updating profile:", updateError)
      return NextResponse.json({ error: "Failed to reset account" }, { status: 500 })
    }

    console.log("[v0] Successfully reset account to free tier")
    return NextResponse.json({
      success: true,
      message: "Account reset to free tier successfully",
    })
  } catch (error) {
    console.error("[v0] Error resetting account:", error)
    return NextResponse.json({ error: "Failed to reset account" }, { status: 500 })
  }
}
