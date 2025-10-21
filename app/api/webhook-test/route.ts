import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "API routing is working",
    timestamp: new Date().toISOString(),
  })
}

export async function POST() {
  return NextResponse.json({
    status: "ok",
    message: "POST request received",
    timestamp: new Date().toISOString(),
  })
}
