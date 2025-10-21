import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Debug API: Creating Supabase client")
    const supabase = await createClient()

    console.log("[v0] Debug API: Testing auth")
    const { data, error } = await supabase.auth.getUser()

    console.log("[v0] Debug API: Auth result", {
      hasUser: !!data?.user,
      error: error?.message,
    })

    return NextResponse.json({
      success: true,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      error: error?.message || null,
      env: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    })
  } catch (err) {
    console.error("[v0] Debug API error:", err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
