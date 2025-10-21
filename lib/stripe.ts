import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  typescript: true,
})

export const STRIPE_CONFIG = {
  // Stripe Payment Links for each plan
  PLUS_PAYMENT_LINK: "https://buy.stripe.com/eVq9ASeEy1WG4138IPd3i05", // Production Plus payment link
  PRO_PAYMENT_LINK: "https://buy.stripe.com/8x228qaoi0SC0OR6AHd3i04", // Production Pro payment link

  // Webhook endpoint secret
  WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET!,

  // Price IDs (if needed for future programmatic checkout)
  PRICES: {
    PLUS_MONTHLY: process.env.STRIPE_PLUS_PRICE_ID || "", // Will be empty for now during testing
    PRO_MONTHLY: process.env.STRIPE_PRO_PRICE_ID || "",
  },
} as const

/**
 * Creates a Stripe Payment Link URL with prefilled customer email
 */
export function createPaymentLinkUrl(tier: "plus" | "pro", email?: string): string {
  // Added tier parameter
  const baseUrl = tier === "plus" ? STRIPE_CONFIG.PLUS_PAYMENT_LINK : STRIPE_CONFIG.PRO_PAYMENT_LINK

  if (email) {
    const params = new URLSearchParams({
      prefilled_email: email,
    })
    return `${baseUrl}?${params.toString()}`
  }

  return baseUrl
}

/**
 * Validates a Stripe webhook signature
 */
export function validateWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Retrieves a Stripe checkout session with expanded data
 */
export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  })
}

/**
 * Retrieves a Stripe subscription
 */
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId)
}

/**
 * Retrieves a Stripe customer
 */
export async function getCustomer(customerId: string) {
  return stripe.customers.retrieve(customerId)
}
