import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Try to insert a test log
    const { data, error } = await supabase
      .from("webhook_logs")
      .insert({
        event_type: "test.event",
        customer_email: "test@example.com",
        user_id: null,
        subscription_tier: "test",
        success: true,
        error_message: null,
      })
      .select()

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Test log written successfully",
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
