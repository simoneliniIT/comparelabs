import { NextResponse } from "next/server"

export async function GET() {
  console.log("[v0] Test API route accessed successfully")
  return NextResponse.json({
    message: "API routes are working",
    timestamp: new Date().toISOString(),
    success: true,
  })
}
