import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const target = searchParams.get("target") || "/success"

  console.log("[v0] Test redirect API - Redirecting to:", target)

  // This simulates what Stripe does - a server-side redirect
  return NextResponse.redirect(new URL(target, request.url))
}
