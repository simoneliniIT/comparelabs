export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: "free" | "plus" | "pro" // Added 'plus' tier
  subscription_status: "active" | "canceled" | "past_due"
  stripe_customer_id?: string
  created_at: string
  updated_at: string
}

export interface UsageLog {
  id: string
  user_id: string
  model_name: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  cost_usd: number
  created_at: string
}

export interface SubscriptionLimit {
  tier: "free" | "plus" | "pro" // Added 'plus' tier
  daily_queries: number
  monthly_queries: number
  available_models: string[]
  priority_support: boolean
  created_at: string
}
