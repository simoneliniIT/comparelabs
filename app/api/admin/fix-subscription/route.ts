import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {
    const { email, tier } = await req.json()

    if (!email || !tier) {
      return NextResponse.json({ error: "Email and tier are required" }, { status: 400 })
    }

    if (!["free", "plus", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier. Must be free, plus, or pro" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Find user by email
    const { data: userList, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
      return NextResponse.json({ error: "Error listing users", details: userError }, { status: 500 })
    }

    const matchedUser = userList?.users?.find((u: any) => u.email === email)

    if (!matchedUser) {
      return NextResponse.json(
        {
          error: "User not found",
          availableEmails: userList?.users?.map((u: any) => u.email),
        },
        { status: 404 },
      )
    }

    // Update user profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        subscription_tier: tier,
        subscription_status: tier === "free" ? "inactive" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchedUser.id)

    if (updateError) {
      return NextResponse.json({ error: "Error updating profile", details: updateError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${email} to ${tier} tier`,
      userId: matchedUser.id,
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 })
  }
}
