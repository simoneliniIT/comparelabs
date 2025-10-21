import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export const maxDuration = 60

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
})

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

function getBaseEmail(email: string): string {
  // Strip + aliases from email (e.g., user+alias@domain.com -> user@domain.com)
  const normalized = normalizeEmail(email)
  const [localPart, domain] = normalized.split("@")
  const baseLocalPart = localPart.split("+")[0]
  return `${baseLocalPart}@${domain}`
}

async function findUserByEmail(
  supabase: any,
  email: string,
): Promise<{ id: string; email: string; subscription_tier: string } | null> {
  const normalizedEmail = normalizeEmail(email)
  const baseEmail = getBaseEmail(email)

  console.log(`[v0] 🔍 Searching for user with email: ${email}`)
  console.log(`[v0] 🔍 Normalized: ${normalizedEmail}, Base: ${baseEmail}`)

  // Strategy 1: Exact match (case-insensitive)
  console.log(`[v0] 🔍 Strategy 1: Exact email match`)
  const { data: exactMatch, error: exactError } = await supabase
    .from("profiles")
    .select("id, email, subscription_tier")
    .ilike("email", normalizedEmail)
    .single()

  if (exactMatch && !exactError) {
    console.log(`[v0] ✅ Found user via exact match: ${exactMatch.id} (${exactMatch.email})`)
    return exactMatch
  }

  // Strategy 2: Base email match (strip + aliases)
  if (baseEmail !== normalizedEmail) {
    console.log(`[v0] 🔍 Strategy 2: Base email match (without + alias)`)
    const { data: baseMatch, error: baseError } = await supabase
      .from("profiles")
      .select("id, email, subscription_tier")
      .ilike("email", `${baseEmail.split("@")[0]}%@${baseEmail.split("@")[1]}`)

    if (baseMatch && baseMatch.length > 0 && !baseError) {
      // Find the best match - prefer exact base match, then any match with same base
      const exactBaseMatch = baseMatch.find((u: any) => getBaseEmail(u.email) === baseEmail)
      if (exactBaseMatch) {
        console.log(`[v0] ✅ Found user via base email match: ${exactBaseMatch.id} (${exactBaseMatch.email})`)
        return exactBaseMatch
      }
    }
  }

  // Strategy 3: Fallback to auth.admin.listUsers
  console.log(`[v0] 🔍 Strategy 3: Searching via auth.admin.listUsers`)
  const { data: userList, error: userError } = await supabase.auth.admin.listUsers()

  if (!userError && userList?.users) {
    // Try exact match first
    let matchedUser = userList.users.find((u: any) => normalizeEmail(u.email || "") === normalizedEmail)

    // Try base email match
    if (!matchedUser && baseEmail !== normalizedEmail) {
      matchedUser = userList.users.find((u: any) => getBaseEmail(u.email || "") === baseEmail)
    }

    if (matchedUser) {
      console.log(`[v0] ✅ Found user via auth API: ${matchedUser.id} (${matchedUser.email})`)
      return {
        id: matchedUser.id,
        email: matchedUser.email,
        subscription_tier: "free", // Default, will be updated
      }
    }
  }

  console.log(`[v0] ❌ No user found with email: ${email}`)
  return null
}

function getWebhookSecret(event: Stripe.Event): string {
  // Check if this is a test event by looking at the event ID or livemode property
  const isTestEvent = !event.livemode || event.id.startsWith("evt_test_")

  if (isTestEvent) {
    const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
    if (!testSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET_TEST environment variable is required for test events")
    }
    return testSecret
  } else {
    const prodSecret = process.env.STRIPE_WEBHOOK_SECRET_PROD || process.env.STRIPE_WEBHOOK_SECRET
    if (!prodSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET_PROD environment variable is required for live events")
    }
    return prodSecret
  }
}

export async function GET(req: NextRequest) {
  console.log("[v0] GET request to webhook endpoint - route is accessible")
  return NextResponse.json({
    status: "ok",
    message: "Stripe webhook endpoint is accessible",
    timestamp: new Date().toISOString(),
    url: req.url,
    method: req.method,
  })
}

export async function POST(req: NextRequest) {
  console.log("[v0] =================================")
  console.log("[v0] 🎯 WEBHOOK ENDPOINT HIT - Request received")
  console.log("[v0] Request URL:", req.url)
  console.log("[v0] Request method:", req.method)
  console.log("[v0] Stripe webhook received at:", new Date().toISOString())

  try {
    const body = await req.arrayBuffer()
    const signature = req.headers.get("stripe-signature")!
    console.log("[v0] Webhook signature present:", !!signature)
    console.log("[v0] Body size:", body.byteLength, "bytes")

    let event: Stripe.Event

    try {
      // Try with test secret first (most common during development)
      const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST
      const prodSecret = process.env.STRIPE_WEBHOOK_SECRET_PROD || process.env.STRIPE_WEBHOOK_SECRET

      console.log("[v0] Available secrets - Test:", !!testSecret, "Prod:", !!prodSecret)

      let constructionError: any = null

      if (testSecret) {
        try {
          event = await stripe.webhooks.constructEventAsync(Buffer.from(body), signature, testSecret)
          console.log(`[v0] ✅ Webhook verified with TEST secret for event: ${event.type}`)
        } catch (err) {
          constructionError = err
          console.log(`[v0] ❌ Test secret failed, trying prod secret...`)
          // If test secret fails, try production secret
          if (prodSecret) {
            event = await stripe.webhooks.constructEventAsync(Buffer.from(body), signature, prodSecret)
            console.log(`[v0] ✅ Webhook verified with PROD secret for event: ${event.type}`)
          } else {
            throw constructionError
          }
        }
      } else if (prodSecret) {
        event = await stripe.webhooks.constructEventAsync(Buffer.from(body), signature, prodSecret)
        console.log(`[v0] ✅ Webhook verified with PROD secret for event: ${event.type}`)
      } else {
        throw new Error("No webhook secrets configured")
      }
    } catch (err) {
      console.error("[v0] ❌ Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Initialize Supabase client
    const supabase = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    console.log(`[v0] 🔄 Processing Stripe webhook: ${event.type} (${event.livemode ? "LIVE" : "TEST"} mode)`)
    console.log(`[v0] Event ID: ${event.id}`)

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`[v0] 💳 Checkout session completed: ${session.id}`)
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`[v0] 🆕 Subscription created: ${subscription.id}`)
        await handleSubscriptionCreated(supabase, subscription)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[v0] 💰 Invoice payment succeeded: ${invoice.id}`)
        await handleInvoicePaid(supabase, invoice)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`[v0] ❌ Invoice payment failed: ${invoice.id}`)
        await handleInvoicePaymentFailed(supabase, invoice)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`[v0] 🔄 Subscription updated: ${subscription.id}`)
        await handleSubscriptionUpdated(supabase, subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`[v0] 🗑️ Subscription deleted: ${subscription.id}`)
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      default:
        console.log(`[v0] ⚠️ Unhandled Stripe webhook event: ${event.type}`)
    }

    console.log("[v0] ✅ Webhook processing completed successfully")
    console.log("[v0] =================================")
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[v0] ❌ Stripe webhook error:", error)
    console.log("[v0] =================================")
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

async function logWebhookEvent(
  supabase: any,
  eventId: string,
  eventType: string,
  data: {
    customerEmail?: string | null
    userId?: string | null
    subscriptionTier?: string
    success: boolean
    errorMessage?: string
    rawData?: any
  },
) {
  try {
    await supabase.from("webhook_logs").insert({
      event_id: eventId,
      event_type: eventType,
      customer_email: data.customerEmail,
      user_id: data.userId,
      subscription_tier: data.subscriptionTier,
      success: data.success,
      error_message: data.errorMessage,
      raw_data: data.rawData,
    })
  } catch (error) {
    console.error("[v0] Failed to log webhook event:", error)
  }
}

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  console.log(`[v0] 🔍 Processing checkout completion for session: ${session.id}`)
  console.log(`[v0] Session mode: ${session.mode}`)
  console.log(`[v0] Session payment status: ${session.payment_status}`)

  const clientReferenceId = session.client_reference_id
  const customerEmail = session.customer_details?.email || session.customer_email
  let stripeCustomerId: string | null = null
  let stripeSubscriptionId: string | null = null

  console.log(`[v0] Client reference ID (user ID): ${clientReferenceId}`)
  console.log(`[v0] Customer email: ${customerEmail}`)

  // Handle customer ID - could be string or object
  if (typeof session.customer === "string") {
    stripeCustomerId = session.customer
  } else if (session.customer && typeof session.customer === "object" && "id" in session.customer) {
    stripeCustomerId = session.customer.id
  }

  // Handle subscription ID - could be string or object
  if (typeof session.subscription === "string") {
    stripeSubscriptionId = session.subscription
  } else if (session.subscription && typeof session.subscription === "object" && "id" in session.subscription) {
    stripeSubscriptionId = session.subscription.id
  }

  console.log(`[v0] Stripe customer ID: ${stripeCustomerId}`)
  console.log(`[v0] Stripe subscription ID: ${stripeSubscriptionId}`)

  if (!stripeCustomerId && customerEmail) {
    console.log(`[v0] 🔍 No customer ID in session, searching by email: ${customerEmail}`)
    try {
      const customers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      })
      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id
        console.log(`[v0] ✅ Found customer ID: ${stripeCustomerId}`)

        if (!stripeSubscriptionId) {
          const subscriptions = await stripe.subscriptions.list({
            customer: stripeCustomerId,
            status: "active",
            limit: 1,
          })
          if (subscriptions.data.length > 0) {
            stripeSubscriptionId = subscriptions.data[0].id
            console.log(`[v0] ✅ Found subscription ID: ${stripeSubscriptionId}`)
          }
        }
      }
    } catch (error) {
      console.error(`[v0] ❌ Error searching for customer: ${error}`)
    }
  }

  let profile = null

  if (clientReferenceId) {
    console.log(`[v0] 🔍 Strategy 1: Looking up user by client_reference_id: ${clientReferenceId}`)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, subscription_tier")
      .eq("id", clientReferenceId)
      .single()

    if (data && !error) {
      profile = data
      console.log(`[v0] ✅ Found user via client_reference_id: ${profile.id} (${profile.email})`)
    } else {
      console.log(`[v0] ⚠️ No user found with ID: ${clientReferenceId}`)
    }
  }

  if (!profile && customerEmail) {
    console.log(`[v0] 🔍 Strategy 2: Falling back to email lookup`)
    profile = await findUserByEmail(supabase, customerEmail)
  }

  if (!profile) {
    console.error(`[v0] ❌ No user found with client_reference_id: ${clientReferenceId} or email: ${customerEmail}`)
    await logWebhookEvent(supabase, session.id, "checkout.session.completed", {
      customerEmail,
      success: false,
      errorMessage: `No user found with client_reference_id: ${clientReferenceId} or email: ${customerEmail}`,
      rawData: { session_id: session.id, client_reference_id: clientReferenceId },
    })
    return
  }

  const userId = profile.id
  console.log(`[v0] ✅ Found user: ${userId} (${profile.email})`)

  let subscriptionTier = "free" // Default to free
  let currentPeriodEnd = null

  if (stripeSubscriptionId) {
    try {
      console.log(`[v0] 🔍 Retrieving subscription details: ${stripeSubscriptionId}`)
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()
      console.log(`[v0] Subscription period ends: ${currentPeriodEnd}`)

      // Get the price from the subscription
      const priceId = subscription.items.data[0]?.price.id
      const priceAmount = subscription.items.data[0]?.price.unit_amount // Amount in cents

      console.log(`[v0] 🔍 Price ID: ${priceId}`)
      console.log(`[v0] 🔍 Price amount: ${priceAmount} cents`)

      // Determine tier based on price amount (more reliable than price IDs)
      // Plus plan is $9.99 (999 cents), Pro plan is $29.99 (2999 cents)
      if (priceAmount) {
        if (priceAmount >= 2500) {
          // $25 or more = Pro
          subscriptionTier = "pro"
          console.log(`[v0] ✅ Detected Pro tier based on price: $${priceAmount / 100}`)
        } else if (priceAmount >= 500) {
          // $5 or more but less than $25 = Plus
          subscriptionTier = "plus"
          console.log(`[v0] ✅ Detected Plus tier based on price: $${priceAmount / 100}`)
        }
      }

      // Fallback: check environment variable price IDs if amount detection fails
      if (subscriptionTier === "free" && priceId) {
        if (priceId === process.env.STRIPE_PLUS_PRICE_ID) {
          subscriptionTier = "plus"
          console.log(`[v0] ✅ Detected Plus tier based on price ID match`)
        } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          subscriptionTier = "pro"
          console.log(`[v0] ✅ Detected Pro tier based on price ID match`)
        }
      }
    } catch (error) {
      console.error("[v0] ❌ Error retrieving subscription:", error)
      await logWebhookEvent(supabase, session.id, "checkout.session.completed", {
        customerEmail,
        success: false,
        errorMessage: `Error retrieving subscription: ${error}`,
        rawData: { session_id: session.id, subscription_id: stripeSubscriptionId },
      })
    }
  }

  // Update user profile with Stripe data
  console.log(`[v0] 🔄 Updating user profile for user: ${userId}`)

  let credits = 500 // Default free tier credits
  if (subscriptionTier === "plus") {
    credits = 10000
  } else if (subscriptionTier === "pro") {
    credits = 30000
  }
  console.log(`[v0] Setting credits to: ${credits} for tier: ${subscriptionTier}`)

  const updateData = {
    subscription_tier: subscriptionTier,
    subscription_status: "active",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    current_period_end: currentPeriodEnd,
    credits: credits, // Added credits to tier allocation
    updated_at: new Date().toISOString(),
  }

  console.log(`[v0] Update data:`, JSON.stringify(updateData, null, 2))

  const { data: updateResult, error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId)
    .select()

  if (updateError) {
    console.error("[v0] ❌ Error updating user profile:", updateError)
    console.error("[v0] ❌ Update error details:", JSON.stringify(updateError, null, 2))
    await logWebhookEvent(supabase, session.id, "checkout.session.completed", {
      customerEmail,
      userId,
      subscriptionTier,
      success: false,
      errorMessage: `Database update failed: ${updateError.message}`,
      rawData: { session_id: session.id, update_data: updateData, error: updateError },
    })
  } else {
    console.log(`[v0] ✅ Successfully upgraded user ${userId} to ${subscriptionTier}`)
    console.log(`[v0] ✅ Update result:`, JSON.stringify(updateResult, null, 2))
    await logWebhookEvent(supabase, session.id, "checkout.session.completed", {
      customerEmail,
      userId,
      subscriptionTier,
      success: true,
      rawData: { session_id: session.id, update_result: updateResult },
    })
  }
}

async function handleSubscriptionCreated(supabase: any, subscription: Stripe.Subscription) {
  console.log(`[v0] 🆕 Processing subscription creation: ${subscription.id}`)

  const stripeCustomerId = subscription.customer as string
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  let subscriptionTier = "free" // Default
  const priceId = subscription.items.data[0]?.price.id
  const priceAmount = subscription.items.data[0]?.price.unit_amount // Amount in cents

  console.log(`[v0] Price ID: ${priceId}`)
  console.log(`[v0] Price amount: ${priceAmount} cents`)

  // Determine tier based on price amount (more reliable)
  if (priceAmount) {
    if (priceAmount >= 2500) {
      // $25 or more = Pro
      subscriptionTier = "pro"
    } else if (priceAmount >= 500) {
      // $5 or more but less than $25 = Plus
      subscriptionTier = "plus"
    }
  }

  // Fallback: check environment variable price IDs
  if (subscriptionTier === "free" && priceId) {
    if (priceId === process.env.STRIPE_PLUS_PRICE_ID) {
      subscriptionTier = "plus"
    } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      subscriptionTier = "pro"
    }
  }

  console.log(`[v0] Customer ID: ${stripeCustomerId}`)
  console.log(`[v0] Subscription status: ${subscription.status}`)
  console.log(`[v0] Subscription tier: ${subscriptionTier}`)
  console.log(`[v0] Current period end: ${currentPeriodEnd}`)

  // Find user by Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single()

  if (profileError || !profile) {
    console.error(`[v0] No user found with Stripe customer ID: ${stripeCustomerId}`)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.created", {
      success: false,
      errorMessage: `No user found with Stripe customer ID: ${stripeCustomerId}`,
      rawData: { subscription_id: subscription.id },
    })
    return
  }

  console.log(`[v0] ✅ Found matching user: ${profile.id}`)

  let credits = 500 // Default free tier credits
  if (subscriptionTier === "plus") {
    credits = 10000
  } else if (subscriptionTier === "pro") {
    credits = 30000
  }
  console.log(`[v0] Setting credits to: ${credits} for tier: ${subscriptionTier}`)

  // Update user profile with subscription data
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: subscriptionTier,
      subscription_status: subscription.status === "active" ? "active" : subscription.status,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd,
      credits: credits, // Added credits to tier allocation
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)

  if (updateError) {
    console.error("[v0] ❌ Error updating user profile:", updateError)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.created", {
      userId: profile.id,
      subscriptionTier,
      success: false,
      errorMessage: `Database update failed: ${updateError.message}`,
      rawData: {
        subscription_id: subscription.id,
        update_data: {
          subscription_tier: subscriptionTier,
          subscription_status: subscription.status,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: subscription.id,
          current_period_end: currentPeriodEnd,
          credits: credits, // Added credits to tier allocation
          updated_at: new Date().toISOString(),
        },
        error: updateError,
      },
    })
  } else {
    console.log(`[v0] ✅ Successfully created ${subscriptionTier} subscription for user ${profile.id}`)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.created", {
      userId: profile.id,
      subscriptionTier,
      success: true,
      rawData: { subscription_id: subscription.id },
    })
  }
}

async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  console.log(`[v0] 💰 Processing paid invoice: ${invoice.id}`)
  console.log(`[v0] Invoice customer email: ${invoice.customer_email}`)

  const stripeCustomerId = invoice.customer as string
  const stripeSubscriptionId = invoice.subscription as string
  const customerEmail = invoice.customer_email

  console.log(`[v0] Customer ID: ${stripeCustomerId}`)
  console.log(`[v0] Subscription ID: ${stripeSubscriptionId}`)

  let profile = null

  if (customerEmail) {
    profile = await findUserByEmail(supabase, customerEmail)
  }

  // Fallback to customer ID lookup
  if (!profile && stripeCustomerId) {
    console.log(`[v0] 🔍 Fallback: Looking up user by Stripe customer ID: ${stripeCustomerId}`)
    const result = await supabase
      .from("profiles")
      .select("id, email, subscription_tier")
      .eq("stripe_customer_id", stripeCustomerId)
      .single()
    profile = result.data

    if (profile) {
      console.log(`[v0] ✅ Found user by customer ID: ${profile.id}, current tier: ${profile.subscription_tier}`)
    }
  }

  if (!profile) {
    console.error(`[v0] ❌ No user found with email ${customerEmail} or Stripe customer ID: ${stripeCustomerId}`)
    await logWebhookEvent(supabase, invoice.id, "invoice.payment_succeeded", {
      customerEmail,
      success: false,
      errorMessage: `No user found with email ${customerEmail} or Stripe customer ID: ${stripeCustomerId}`,
      rawData: { invoice_id: invoice.id, customer_email: customerEmail, customer_id: stripeCustomerId },
    })
    return
  }

  let subscriptionTier = "free"
  let credits = 500
  let currentPeriodEnd = null

  if (stripeSubscriptionId) {
    try {
      console.log(`[v0] 🔍 Retrieving subscription details: ${stripeSubscriptionId}`)
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

      const priceId = subscription.items.data[0]?.price.id
      const priceAmount = subscription.items.data[0]?.price.unit_amount

      console.log(`[v0] Price ID: ${priceId}`)
      console.log(`[v0] Price amount: ${priceAmount} cents`)

      // Determine tier based on price amount
      if (priceAmount) {
        if (priceAmount >= 2500) {
          // $25 or more = Pro
          subscriptionTier = "pro"
          credits = 30000
          console.log(`[v0] ✅ Detected Pro tier based on price: $${priceAmount / 100}`)
        } else if (priceAmount >= 500) {
          // $5 or more but less than $25 = Plus
          subscriptionTier = "plus"
          credits = 10000
          console.log(`[v0] ✅ Detected Plus tier based on price: $${priceAmount / 100}`)
        }
      }

      // Fallback: check environment variable price IDs
      if (subscriptionTier === "free" && priceId) {
        if (priceId === process.env.STRIPE_PLUS_PRICE_ID) {
          subscriptionTier = "plus"
          credits = 10000
          console.log(`[v0] ✅ Detected Plus tier based on price ID match`)
        } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
          subscriptionTier = "pro"
          credits = 30000
          console.log(`[v0] ✅ Detected Pro tier based on price ID match`)
        }
      }
    } catch (error) {
      console.error("[v0] ❌ Error retrieving subscription:", error)
      await logWebhookEvent(supabase, invoice.id, "invoice.payment_succeeded", {
        customerEmail,
        userId: profile.id,
        success: false,
        errorMessage: `Error retrieving subscription: ${error}`,
        rawData: { invoice_id: invoice.id, subscription_id: stripeSubscriptionId },
      })
      return
    }
  }

  console.log(`[v0] 🔄 Updating user ${profile.id} to tier: ${subscriptionTier}, credits: ${credits}`)

  const updateData = {
    subscription_tier: subscriptionTier,
    subscription_status: "active",
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    current_period_end: currentPeriodEnd,
    credits: credits,
    updated_at: new Date().toISOString(),
  }

  console.log(`[v0] Update data:`, JSON.stringify(updateData, null, 2))

  const { data: updateResult, error: updateError } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", profile.id)
    .select()

  if (updateError) {
    console.error("[v0] ❌ Error updating user profile after payment:", updateError)
    console.error("[v0] ❌ Update error details:", JSON.stringify(updateError, null, 2))
    await logWebhookEvent(supabase, invoice.id, "invoice.payment_succeeded", {
      customerEmail,
      userId: profile.id,
      subscriptionTier,
      success: false,
      errorMessage: `Database update failed: ${updateError.message}`,
      rawData: {
        invoice_id: invoice.id,
        update_data: updateData,
        error: updateError,
      },
    })
  } else {
    console.log(`[v0] ✅ Successfully renewed ${subscriptionTier} subscription for user ${profile.id}`)
    console.log(`[v0] ✅ Update result:`, JSON.stringify(updateResult, null, 2))
    await logWebhookEvent(supabase, invoice.id, "invoice.payment_succeeded", {
      customerEmail,
      userId: profile.id,
      subscriptionTier,
      success: true,
      rawData: { invoice_id: invoice.id, update_result: updateResult },
    })
  }
}

async function handleInvoicePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  console.log(`[v0] Processing failed payment for invoice: ${invoice.id}`)

  const stripeCustomerId = invoice.customer as string

  // Find user by Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single()

  if (profileError || !profile) {
    console.error(`[v0] No user found with Stripe customer ID: ${stripeCustomerId}`)
    await logWebhookEvent(supabase, invoice.id, "invoice.payment_failed", {
      success: false,
      errorMessage: `No user found with Stripe customer ID: ${stripeCustomerId}`,
      rawData: { invoice_id: invoice.id },
    })
    return
  }

  // Downgrade to free plan on payment failure
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)

  if (updateError) {
    console.error("[v0] Error downgrading user after payment failure:", updateError)
    await logWebhookEvent(supabase, invoice.id, "invoice.payment_failed", {
      userId: profile.id,
      success: false,
      errorMessage: `Database update failed: ${updateError.message}`,
      rawData: {
        invoice_id: invoice.id,
        update_data: {
          subscription_tier: "free",
          subscription_status: "past_due",
          updated_at: new Date().toISOString(),
        },
        error: updateError,
      },
    })
  } else {
    console.log(`[v0] Downgraded user ${profile.id} to free plan due to payment failure`)
    await logWebhookEvent(supabase, invoice.id, "invoice.payment_failed", {
      userId: profile.id,
      success: true,
      rawData: { invoice_id: invoice.id },
    })
  }
}

async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  console.log(`[v0] Processing subscription update: ${subscription.id}`)

  const stripeCustomerId = subscription.customer as string
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

  // Find user by Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single()

  if (profileError || !profile) {
    console.error(`[v0] No user found with Stripe customer ID: ${stripeCustomerId}`)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.updated", {
      success: false,
      errorMessage: `No user found with Stripe customer ID: ${stripeCustomerId}`,
      rawData: { subscription_id: subscription.id },
    })
    return
  }

  let subscriptionStatus = "active"
  let subscriptionTier = "free" // Default

  const priceId = subscription.items.data[0]?.price.id
  const priceAmount = subscription.items.data[0]?.price.unit_amount

  console.log(`[v0] Price ID: ${priceId}`)
  console.log(`[v0] Price amount: ${priceAmount} cents`)

  if (priceAmount) {
    if (priceAmount >= 2500) {
      subscriptionTier = "pro"
    } else if (priceAmount >= 500) {
      subscriptionTier = "plus"
    }
  }

  // Fallback: check environment variable price IDs
  if (subscriptionTier === "free" && priceId) {
    if (priceId === process.env.STRIPE_PLUS_PRICE_ID) {
      subscriptionTier = "plus"
    } else if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
      subscriptionTier = "pro"
    }
  }

  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    subscriptionTier = "free"
    subscriptionStatus = "canceled"
  } else if (subscription.status === "past_due") {
    subscriptionStatus = "past_due"
  }

  // Update user profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: subscriptionTier,
      subscription_status: subscriptionStatus,
      current_period_end: currentPeriodEnd,
      credits: subscriptionTier === "pro" ? 30000 : subscriptionTier === "plus" ? 10000 : 500, // Added credits update based on tier
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)

  if (updateError) {
    console.error("[v0] Error updating user profile after subscription update:", updateError)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.updated", {
      userId: profile.id,
      subscriptionTier,
      success: false,
      errorMessage: `Database update failed: ${updateError.message}`,
      rawData: {
        subscription_id: subscription.id,
        update_data: {
          subscription_tier: subscriptionTier,
          subscription_status: subscriptionStatus,
          current_period_end: currentPeriodEnd,
          credits: subscriptionTier === "pro" ? 30000 : subscriptionTier === "plus" ? 10000 : 500, // Added credits update based on tier
          updated_at: new Date().toISOString(),
        },
        error: updateError,
      },
    })
  } else {
    console.log(`[v0] Updated subscription for user ${profile.id}: ${subscriptionTier}/${subscriptionStatus}`)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.updated", {
      userId: profile.id,
      subscriptionTier,
      success: true,
      rawData: { subscription_id: subscription.id },
    })
  }
}

async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  console.log(`[v0] Processing subscription deletion: ${subscription.id}`)

  const stripeCustomerId = subscription.customer as string

  // Find user by Stripe customer ID
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", stripeCustomerId)
    .single()

  if (profileError || !profile) {
    console.error(`[v0] No user found with Stripe customer ID: ${stripeCustomerId}`)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.deleted", {
      success: false,
      errorMessage: `No user found with Stripe customer ID: ${stripeCustomerId}`,
      rawData: { subscription_id: subscription.id },
    })
    return
  }

  // Downgrade to free plan
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "canceled",
      stripe_subscription_id: null,
      current_period_end: null,
      credits: 500, // Added credits reset to free tier credits
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)

  if (updateError) {
    console.error("[v0] Error downgrading user after subscription deletion:", updateError)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.deleted", {
      userId: profile.id,
      success: false,
      errorMessage: `Database update failed: ${updateError.message}`,
      rawData: {
        subscription_id: subscription.id,
        update_data: {
          subscription_tier: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
          credits: 500, // Added credits reset to free tier credits
          updated_at: new Date().toISOString(),
        },
        error: updateError,
      },
    })
  } else {
    console.log(`[v0] Downgraded user ${profile.id} to free plan after subscription deletion`)
    await logWebhookEvent(supabase, subscription.id, "customer.subscription.deleted", {
      userId: profile.id,
      success: true,
      rawData: { subscription_id: subscription.id },
    })
  }
}
