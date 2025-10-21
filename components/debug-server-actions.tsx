"use client"

import { useEffect } from "react"

export function DebugServerActions() {
  useEffect(() => {
    // Listen for unhandled promise rejections that might be server action related
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log("[v0] Unhandled promise rejection:", event.reason)
      if (event.reason?.message?.includes("server action") || event.reason?.message?.includes("Server Action")) {
        console.log("[v0] Server action error detected:", event.reason)
      }
    }

    // Listen for general errors
    const handleError = (event: ErrorEvent) => {
      console.log("[v0] Global error:", event.error)
      if (event.error?.message?.includes("server action") || event.error?.message?.includes("Server Action")) {
        console.log("[v0] Server action error detected:", event.error)
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleError)
    }
  }, [])

  return null
}
