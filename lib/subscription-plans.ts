/**
 * Subscription Plans Configuration
 *
 * This file contains the source of truth for all subscription plans.
 * Price IDs are stored here to prevent client-side tampering.
 *
 * IMPORTANT: Make sure you're using TEST mode price IDs if your app uses test API keys,
 * or LIVE mode price IDs if using live API keys. Mixing them will cause errors.
 *
 * To find your price IDs:
 * 1. Go to Stripe Dashboard (https://dashboard.stripe.com)
 * 2. Toggle to TEST mode (top right corner - should show "Test mode" badge)
 * 3. Go to Products → [Your Product] → Pricing
 * 4. Copy the API ID (starts with "price_")
 */

export interface SubscriptionPlan {
  id: "free" | "plus" | "pro"
  name: string
  priceInCents: number
  credits: number
  stripePriceId?: string
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    priceInCents: 0,
    credits: 500,
  },
  {
    id: "plus",
    name: "Plus",
    priceInCents: 999, // $9.99
    credits: 10000,
    stripePriceId: "price_1SItRVBOPCo2uutmdBmLJuHv", // LIVE mode Plus monthly price
  },
  {
    id: "pro",
    name: "Pro",
    priceInCents: 2999, // $29.99
    credits: 30000,
    stripePriceId: "price_1SBEEWBOPCo2uutmRIlWoslv", // LIVE mode Pro monthly price
  },
]

/**
 * Get a subscription plan by tier
 */
export function getSubscriptionPlan(tier: "free" | "plus" | "pro"): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === tier)
}

/**
 * Get a subscription plan by Stripe price ID
 */
export function getSubscriptionPlanByPriceId(priceId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.stripePriceId === priceId)
}
