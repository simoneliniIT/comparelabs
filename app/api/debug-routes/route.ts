import { NextResponse } from "next/server"

export async function GET() {
  console.log("[v0] Debug API - Route accessed successfully")

  const debugInfo = {
    timestamp: new Date().toISOString(),
    message: "Debug API route is working",
    environment: process.env.NODE_ENV,
    routes: {
      "/success": "Should be accessible",
      "/billing/success": "Should be accessible",
      "/test-route": "Should be accessible",
      "/debug-routes": "Currently accessible",
    },
  }

  return NextResponse.json(debugInfo)
}
