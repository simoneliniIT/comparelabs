import { createClient } from "@/lib/supabase/server"
import type { User } from "@supabase/supabase-js"
import { getServerAIModels } from "./ai-models-server"

export interface UsageCheck {
  allowed: boolean
  reason?: string
  remainingCredits?: number
}

const TEST_ACCOUNTS = ["simonelini@gmail.com"]

export async function checkUsageLimit(user: User, modelIds: string[]): Promise<UsageCheck> {
  const supabase = await createClient()

  console.log(`[v0] Checking usage limit for user: ${user.id}`)
  console.log(`[v0] User email: ${user.email}`)

  if (user.email && TEST_ACCOUNTS.includes(user.email)) {
    console.log(`[v0] Test account detected: ${user.email} - bypassing rate limits`)
    return { allowed: true }
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, credits")
    .eq("id", user.id)
    .single()

  console.log(`[v0] Profile query result:`, profile)
  console.log(`[v0] Profile query error:`, profileError)

  if (!profile) {
    console.error(`[v0] User profile not found for user ${user.id}`)
    throw new Error("User profile not found")
  }

  if (profile.subscription_status !== "active") {
    return { allowed: false, reason: "Subscription is not active" }
  }

  const models = getServerAIModels()
  const totalCreditsNeeded = modelIds.reduce((sum, modelId) => {
    const model = models[modelId]
    return sum + (model?.creditsPerQuestion || 0)
  }, 0)

  console.log(`[v0] Models requested: ${modelIds.join(", ")}`)
  console.log(`[v0] Total credits needed: ${totalCreditsNeeded}`)
  console.log(`[v0] Current credits: ${profile.credits || 0}`)

  const currentCredits = profile.credits || 0
  if (currentCredits < totalCreditsNeeded) {
    return {
      allowed: false,
      reason: `Insufficient credits. You have ${currentCredits} credits but need ${totalCreditsNeeded} for this request.`,
      remainingCredits: currentCredits,
    }
  }

  return {
    allowed: true,
    remainingCredits: currentCredits,
  }
}

export async function logUsage(user: User, modelName: string, promptTokens = 0, completionTokens = 0, costUsd = 0) {
  const supabase = await createClient()

  const { error: usageError } = await supabase.from("usage_logs").insert({
    user_id: user.id,
    model_name: modelName,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    cost_usd: costUsd,
  })

  if (usageError) {
    console.error("[v0] Failed to log usage:", usageError)
    return
  }
}

export async function deductCreditsForComparison(user: User, modelIds: string[]) {
  const supabase = await createClient()
  const models = getServerAIModels()

  const { data: profileBefore } = await supabase.from("profiles").select("credits").eq("id", user.id).single()

  const creditsBefore = profileBefore?.credits || 0

  const totalCredits = modelIds.reduce((sum, modelId) => {
    const model = models[modelId]
    return sum + (model?.creditsPerQuestion || 0)
  }, 0)

  console.log(`[v0] ===== CREDIT DEDUCTION START =====`)
  console.log(`[v0] User: ${user.email} (${user.id})`)
  console.log(`[v0] Credits before: ${creditsBefore}`)
  console.log(`[v0] Models to compare: ${modelIds.length} (${modelIds.join(", ")})`)
  console.log(`[v0] Total credits to deduct: ${totalCredits}`)
  console.log(`[v0] Expected credits after: ${creditsBefore - totalCredits}`)

  let currentCredits = creditsBefore

  // Deduct credits for each model based on its category
  for (let i = 0; i < modelIds.length; i++) {
    const modelId = modelIds[i]
    const model = models[modelId]
    const creditsToDeduct = model?.creditsPerQuestion || 0

    console.log(`[v0] Deducting ${creditsToDeduct} credits for model: ${modelId} (${model?.bucket})`)
    console.log(`[v0] Credits before this deduction: ${currentCredits}`)

    const { error } = await supabase.rpc("deduct_credits", {
      user_id: user.id,
      amount: creditsToDeduct,
      model_name: modelId,
    })

    if (error) {
      console.error(`[v0] Failed to deduct credits for model ${modelId}:`, error)
    } else {
      const { data: profileCheck } = await supabase.from("profiles").select("credits").eq("id", user.id).single()
      const creditsAfterDeduction = profileCheck?.credits || 0
      const deducted = currentCredits - creditsAfterDeduction

      console.log(`[v0] Credits after this deduction: ${creditsAfterDeduction}`)
      console.log(`[v0] Amount deducted: ${deducted}`)

      if (deducted !== creditsToDeduct) {
        console.error(`[v0] ⚠️ UNEXPECTED DEDUCTION! Expected ${creditsToDeduct} credits but ${deducted} were deducted`)
      }

      currentCredits = creditsAfterDeduction
    }
  }

  const { data: profileAfter } = await supabase.from("profiles").select("credits").eq("id", user.id).single()

  const creditsAfter = profileAfter?.credits || 0
  const actualDeducted = creditsBefore - creditsAfter

  console.log(`[v0] Credits after all deductions: ${creditsAfter}`)
  console.log(`[v0] Total credits deducted: ${actualDeducted}`)

  if (actualDeducted !== totalCredits) {
    console.error(`[v0] ⚠️ CREDIT MISMATCH! Expected to deduct ${totalCredits} but actually deducted ${actualDeducted}`)
    console.error(`[v0] Difference: ${actualDeducted - totalCredits} extra credits deducted`)
  } else {
    console.log(`[v0] ✓ Credit deduction verified correctly`)
  }

  console.log(`[v0] ===== CREDIT DEDUCTION END =====`)
}

export async function checkModelAccess(
  user: User,
  modelIds: string[],
): Promise<{ allowed: boolean; reason?: string; allowedModels?: string[] }> {
  console.log(`[v0] Checking model access for user: ${user.id}, models:`, modelIds)
  console.log(`[v0] All models are accessible - credits are the only restriction`)

  // All models are allowed for all users - credits are the only restriction
  return { allowed: true, allowedModels: modelIds }
}
