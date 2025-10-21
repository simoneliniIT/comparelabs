import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { action, tier } = await request.json()

    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    if (action === "upgrade") {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: tier,
          subscription_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        return NextResponse.json({ error: "Failed to upgrade subscription" }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Subscription upgraded successfully" })
    }

    if (action === "cancel") {
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: "free",
          subscription_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) {
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "Subscription cancelled successfully" })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Subscription API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
