"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface CancelSubscriptionButtonProps {
  stripeSubscriptionId?: string | null
  currentTier?: string | null
}

export function CancelSubscriptionButton({ stripeSubscriptionId, currentTier }: CancelSubscriptionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isRetrieving, setIsRetrieving] = useState(false)
  const [actualSubscriptionId, setActualSubscriptionId] = useState<string | null>(stripeSubscriptionId || null)
  const [retrievalAttempted, setRetrievalAttempted] = useState(false)
  const [retrievalError, setRetrievalError] = useState<string | null>(null)
  const router = useRouter()

  console.log("[v0] CancelSubscriptionButton props:", { stripeSubscriptionId, currentTier })

  useEffect(() => {
    if (!stripeSubscriptionId && currentTier === "pro" && !retrievalAttempted) {
      retrieveSubscriptionId()
    }
  }, [stripeSubscriptionId, currentTier, retrievalAttempted])

  const retrieveSubscriptionId = async () => {
    setIsRetrieving(true)
    setRetrievalAttempted(true)
    setRetrievalError(null)
    console.log("[v0] Attempting to retrieve missing subscription ID")

    try {
      const response = await fetch("/api/subscription/retrieve-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (response.ok && data.subscriptionId) {
        console.log("[v0] Successfully retrieved subscription ID:", data.subscriptionId)
        setActualSubscriptionId(data.subscriptionId)
        toast.success("Subscription details retrieved successfully")
      } else {
        console.log("[v0] Failed to retrieve subscription ID:", data.error)
        setRetrievalError(data.error || "Unable to retrieve subscription details")
        // Don't show error toast immediately, let user see the UI options
      }
    } catch (error) {
      console.error("[v0] Error retrieving subscription ID:", error)
      setRetrievalError("Network error while retrieving subscription details")
    } finally {
      setIsRetrieving(false)
    }
  }

  const handleResetAccount = async () => {
    setIsLoading(true)
    console.log("[v0] Resetting account to free tier")

    try {
      const response = await fetch("/api/subscription/reset-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset account")
      }

      console.log("[v0] Account reset successfully")
      toast.success("Account reset to free tier. Please manually cancel any active subscriptions in Stripe.")

      // Refresh the page to show updated subscription status
      router.refresh()
    } catch (error) {
      console.error("[v0] Error resetting account:", error)
      toast.error(error instanceof Error ? error.message : "Failed to reset account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    const subscriptionId = actualSubscriptionId || stripeSubscriptionId

    if (!subscriptionId) {
      toast.error("No active subscription found")
      return
    }

    setIsLoading(true)
    console.log("[v0] Cancelling subscription:", subscriptionId)

    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriptionId: subscriptionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription")
      }

      console.log("[v0] Subscription cancelled successfully")
      toast.success("Subscription cancelled successfully. You'll retain access until your billing period ends.")

      // Refresh the page to show updated subscription status
      router.refresh()
    } catch (error) {
      console.error("[v0] Error cancelling subscription:", error)
      toast.error(error instanceof Error ? error.message : "Failed to cancel subscription")
    } finally {
      setIsLoading(false)
    }
  }

  // Don't show cancel button if already on free plan
  if (currentTier === "free") {
    return null
  }

  if (isRetrieving && !retrievalAttempted) {
    return (
      <div className="space-y-2">
        <Button variant="destructive" disabled>
          Loading Subscription Details...
        </Button>
        <p className="text-xs text-muted-foreground">Retrieving your subscription information...</p>
      </div>
    )
  }

  if (!actualSubscriptionId && !stripeSubscriptionId && currentTier === "pro" && retrievalAttempted) {
    return (
      <div className="space-y-4 p-4 border border-amber-200 bg-amber-50 rounded-lg">
        <div className="space-y-2">
          <h4 className="font-medium text-amber-800">Subscription Data Issue</h4>
          <p className="text-sm text-amber-700">
            Your account shows a Pro subscription, but we couldn't find the corresponding Stripe subscription data.
          </p>
          {retrievalError && (
            <p className="text-xs text-amber-600 bg-amber-100 p-2 rounded">
              <strong>Details:</strong> {retrievalError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-800">What you can do:</p>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={retrieveSubscriptionId}
              disabled={isRetrieving}
              className="w-full bg-transparent"
            >
              {isRetrieving ? "Searching..." : "🔍 Search Again"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAccount}
              disabled={isLoading}
              className="w-full bg-transparent"
            >
              {isLoading ? "Resetting..." : "🔄 Reset to Free Plan"}
            </Button>

            <Button variant="outline" size="sm" asChild className="w-full bg-transparent">
              <a href="mailto:support@comparelabs.ai?subject=Subscription Issue&body=I have a subscription data issue. My account shows Pro tier but Stripe data is missing.">
                📧 Contact Support
              </a>
            </Button>
          </div>
        </div>

        <p className="text-xs text-amber-600">
          <strong>Note:</strong> If you have an active subscription in Stripe, you may need to cancel it manually in
          your Stripe Customer Portal or contact support for assistance.
        </p>
      </div>
    )
  }

  const hasSubscriptionId = actualSubscriptionId || stripeSubscriptionId

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isLoading || (!hasSubscriptionId && currentTier === "pro")}>
          {isLoading ? "Cancelling..." : "Cancel Subscription"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to cancel your subscription? You'll be downgraded to the free plan at the end of your
            current billing period.
            <br />
            <br />
            <strong>You'll lose access to:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Unlimited queries</li>
              <li>Priority support</li>
              <li>Advanced AI models</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancelSubscription}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading ? "Cancelling..." : "Yes, Cancel Subscription"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
