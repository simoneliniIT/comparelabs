import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripeTest = process.env.STRIPE_SECRET_KEY?.includes("test")
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
  : null

const stripeLive = process.env.STRIPE_SECRET_KEY?.includes("live")
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" })
  : null

// Default stripe instance (whatever key is configured)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Retrieving subscription ID for user")

    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error:", authError?.message || "No user found")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, subscription_tier, email")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.error("[v0] Profile error:", profileError)
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // If subscription ID already exists, return it
    if (profile.stripe_subscription_id) {
      return NextResponse.json({
        subscriptionId: profile.stripe_subscription_id,
        customerId: profile.stripe_customer_id,
      })
    }

    let stripeCustomerId = profile.stripe_customer_id
    const userEmail = profile.email || user.email

    if (!userEmail) {
      console.error("[v0] No email found for user")
      return NextResponse.json({ error: "No email found for user" }, { status: 404 })
    }

    if (!stripeCustomerId) {
      console.log("[v0] No stripe_customer_id found, searching by email:", userEmail)

      const currentMode = process.env.STRIPE_SECRET_KEY?.includes("test") ? "test" : "live"
      console.log("[v0] Current Stripe mode:", currentMode)
      console.log("[v0] Stripe key prefix:", process.env.STRIPE_SECRET_KEY?.substring(0, 8) + "...")

      try {
        // First, try exact email match in current mode
        let customers = await stripe.customers.list({
          email: userEmail,
          limit: 10,
        })

        console.log("[v0] Found", customers.data.length, "customers with exact email match in", currentMode, "mode")

        if (customers.data.length === 0) {
          console.log("[v0] No exact email match in", currentMode, "mode, searching all customers...")

          const allCustomers = await stripe.customers.list({
            limit: 100,
          })

          // Look for customers with similar emails or metadata
          const possibleMatches = allCustomers.data.filter((customer) => {
            const customerEmail = customer.email?.toLowerCase()
            const searchEmail = userEmail.toLowerCase()

            return (
              customerEmail &&
              (customerEmail === searchEmail ||
                customerEmail.includes(searchEmail.split("@")[0]) ||
                searchEmail.includes(customerEmail.split("@")[0]))
            )
          })

          console.log("[v0] Found", possibleMatches.length, "possible email matches in", currentMode, "mode")

          if (possibleMatches.length > 0) {
            customers = { data: possibleMatches }
          }
        }

        if (customers.data.length === 0) {
          console.log("[v0] No Stripe customer found with email:", userEmail, "in", currentMode, "mode")

          const otherMode = currentMode === "test" ? "live" : "test"
          return NextResponse.json(
            {
              error: `No Stripe customer found with email "${userEmail}" in ${currentMode} mode. 

POSSIBLE SOLUTIONS:
1. Check if your customer exists in ${otherMode} mode instead
2. Verify the email matches exactly in your Stripe Dashboard
3. Make sure you're using the correct Stripe API keys (test vs live)

Current mode: ${currentMode}
API key starts with: ${process.env.STRIPE_SECRET_KEY?.substring(0, 8)}...`,
            },
            { status: 404 },
          )
        }

        // Use the first customer found
        stripeCustomerId = customers.data[0].id
        console.log(
          "[v0] Found Stripe customer:",
          stripeCustomerId,
          "with email:",
          customers.data[0].email,
          "in",
          currentMode,
          "mode",
        )

        // Update profile with the found customer ID
        const { error: customerUpdateError } = await supabase
          .from("profiles")
          .update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (customerUpdateError) {
          console.error("[v0] Error updating customer ID:", customerUpdateError)
        } else {
          console.log("[v0] Successfully updated customer ID in profile")
        }
      } catch (error) {
        console.error("[v0] Error searching for customer:", error)
        return NextResponse.json(
          {
            error: "Failed to search Stripe customers. Please check your Stripe configuration and API keys.",
          },
          { status: 500 },
        )
      }
    }

    console.log("[v0] Retrieving subscriptions for customer:", stripeCustomerId)

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      console.log("[v0] No active subscriptions found, checking other statuses")

      const allSubscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        limit: 10,
      })

      const validSubscriptions = allSubscriptions.data.filter(
        (sub) =>
          sub.status === "active" || sub.status === "past_due" || sub.status === "trialing" || sub.status === "unpaid",
      )

      if (validSubscriptions.length === 0) {
        console.log("[v0] No valid subscriptions found")
        return NextResponse.json({ error: "No valid subscription found" }, { status: 404 })
      }

      // Use the most recent valid subscription
      const subscription = validSubscriptions[0]
      console.log("[v0] Found valid subscription:", subscription.id, "with status:", subscription.status)

      // Update the user's profile with both customer ID and subscription ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateError) {
        console.error("[v0] Error updating profile:", updateError)
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
      }

      console.log("[v0] Successfully retrieved and saved subscription ID")
      return NextResponse.json({ subscriptionId: subscription.id })
    }

    const subscription = subscriptions.data[0]
    console.log("[v0] Found active subscription:", subscription.id)

    // Update the user's profile with both customer ID and subscription ID
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.error("[v0] Error updating profile:", updateError)
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    console.log("[v0] Successfully retrieved and saved subscription ID")
    return NextResponse.json({
      subscriptionId: subscription.id,
      customerId: stripeCustomerId,
    })
  } catch (error) {
    console.error("[v0] Error retrieving subscription ID:", error)
    return NextResponse.json({ error: "Failed to retrieve subscription ID" }, { status: 500 })
  }
}
