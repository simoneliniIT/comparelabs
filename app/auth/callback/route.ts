import { createServerClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/auth/choose-plan"

  console.log("[v0] Auth callback triggered with code:", code ? "present" : "missing")

  if (code) {
    const supabase = await createServerClient()

    try {
      console.log("[v0] Exchanging code for session...")
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("[v0] Error exchanging code for session:", error)
        return NextResponse.redirect(`${origin}/auth/error`)
      }

      if (data?.user) {
        console.log("[v0] Session established successfully for user:", data.user.id)
        console.log("[v0] User email confirmed:", !!data.user.email_confirmed_at)

        const forwardedHost = request.headers.get("x-forwarded-host")
        const isLocalEnv = process.env.NODE_ENV === "development"

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      }
    } catch (error) {
      console.error("[v0] Auth callback exception:", error)
    }
  }

  console.log("[v0] Auth callback failed - redirecting to error page")
  return NextResponse.redirect(`${origin}/auth/error`)
}
