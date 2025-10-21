"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugRoutesPage() {
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (result: string) => {
    console.log("[v0] Debug test:", result)
    setTestResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const testRoute = async (route: string) => {
    try {
      addResult(`Testing route: ${route}`)
      const response = await fetch(route)
      addResult(`Route ${route} - Status: ${response.status} ${response.statusText}`)

      if (response.ok) {
        const text = await response.text()
        addResult(`Route ${route} - Content length: ${text.length} characters`)
      }
    } catch (error) {
      addResult(`Route ${route} - Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const simulateStripeSuccess = () => {
    addResult("Simulating Stripe success redirect...")
    // Simulate what Stripe would do
    window.location.href = "/success?session_id=test_session_123"
  }

  const testServerRedirect = async (target: string) => {
    addResult(`Testing server redirect to: ${target}`)
    try {
      const response = await fetch(`/api/test-redirect?target=${encodeURIComponent(target)}`, {
        redirect: "manual", // Don't follow redirects automatically
      })
      addResult(`Redirect response - Status: ${response.status}, Location: ${response.headers.get("location")}`)
    } catch (error) {
      addResult(`Redirect test error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Route Debugging Tool</CardTitle>
          <CardDescription>Test routes without going through Stripe checkout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => testRoute("/success")} variant="outline">
              Test /success (Fetch)
            </Button>
            <Button onClick={() => testRoute("/billing/success")} variant="outline">
              Test /billing/success (Fetch)
            </Button>
            <Button onClick={() => testRoute("/test-route")} variant="outline">
              Test /test-route (Fetch)
            </Button>
            <Button onClick={() => testRoute("/api/test-success")} variant="outline">
              Test API Route
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link href="/success">
              <Button className="w-full">Navigate to /success</Button>
            </Link>
            <Link href="/billing/success">
              <Button className="w-full">Navigate to /billing/success</Button>
            </Link>
            <Link href="/test-route">
              <Button className="w-full">Navigate to /test-route</Button>
            </Link>
            <Button onClick={simulateStripeSuccess} className="w-full">
              Simulate Stripe Success
            </Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-2">Server Redirect Tests (Simulates Stripe):</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => testServerRedirect("/success")} size="sm" variant="secondary">
                Server Redirect to /success
              </Button>
              <Button onClick={() => testServerRedirect("/billing/success")} size="sm" variant="secondary">
                Server Redirect to /billing/success
              </Button>
              <Button onClick={() => testServerRedirect("/simple-success")} size="sm" variant="secondary">
                Server Redirect to /simple-success
              </Button>
              <Button
                onClick={() => window.open("/api/test-redirect?target=/success", "_blank")}
                size="sm"
                variant="secondary"
              >
                Open Redirect in New Tab
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
            <div className="bg-gray-100 p-4 rounded-lg max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500">No tests run yet</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {result}
                  </div>
                ))
              )}
            </div>
          </div>

          <Button onClick={() => setTestResults([])} variant="outline" className="w-full">
            Clear Results
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
