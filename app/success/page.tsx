import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>Thank you for subscribing to CompareLabs.ai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-800">
              Your subscription is being activated. You'll receive a confirmation email shortly and your credits will be
              available within a few minutes.
            </p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Subscription activated</p>
            <p>✓ Credits will be added to your account</p>
            <p>✓ Confirmation email sent</p>
          </div>

          <Button asChild className="w-full">
            <Link href="/dashboard/billing">View My Subscription</Link>
          </Button>

          <Button asChild variant="outline" className="w-full bg-transparent">
            <Link href="/compare">Start Comparing Models</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
