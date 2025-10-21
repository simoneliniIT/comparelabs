import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkUsageLimit, logUsage, checkModelAccess, deductCreditsForComparison } from "@/lib/usage-tracking"
import { getServerAIModels } from "@/lib/ai-models-server"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { prompt, models, enableSummarization, summarizationModel } = await request.json()

    if (!prompt || !models || !Array.isArray(models)) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const modelAccess = await checkModelAccess(user, models)
    if (!modelAccess.allowed) {
      return NextResponse.json(
        {
          error: modelAccess.reason,
          allowedModels: modelAccess.allowedModels,
        },
        { status: 403 },
      )
    }

    let totalCreditsNeeded = models.length
    if (enableSummarization && summarizationModel) {
      totalCreditsNeeded += 1
    }

    const usageCheck = await checkUsageLimit(user, totalCreditsNeeded)
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason,
          remainingQueries: usageCheck.remainingQueries,
          remainingCredits: usageCheck.remainingCredits, // Added remaining credits to response
          resetDate: usageCheck.resetDate,
        },
        { status: 429 },
      )
    }

    try {
      await deductCreditsForComparison(user, models, enableSummarization || false, summarizationModel)
      console.log(`[v0] Successfully deducted ${totalCreditsNeeded} credits for user ${user.id}`)
    } catch (error) {
      console.error(`[v0] Failed to deduct credits for user ${user.id}:`, error)
      return NextResponse.json({ error: "Failed to deduct credits. Please try again." }, { status: 500 })
    }

    const AI_MODELS_SERVER = getServerAIModels()

    const responses = await Promise.allSettled(
      models.map(async (modelId: string) => {
        const model = AI_MODELS_SERVER[modelId]
        if (!model) {
          throw new Error(`Unknown model: ${modelId}`)
        }

        console.log(`[v0] Calling ${model.name} API for user ${user.id}...`)
        if (modelId === "chatgpt") {
          console.log(`[v0] GPT-5 API endpoint:`, model.endpoint)
          console.log(`[v0] GPT-5 API headers:`, JSON.stringify(model.headers, null, 2))
          console.log(`[v0] GPT-5 API request body:`, JSON.stringify(model.formatRequest(prompt), null, 2))
        }

        const response = await fetch(model.endpoint, {
          method: "POST",
          headers: model.headers,
          body: JSON.stringify(model.formatRequest(prompt)),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`[v0] ${model.name} API error - Status: ${response.status} ${response.statusText}`)
          console.log(`[v0] ${model.name} API error - Full response:`, errorText)
          console.log(
            `[v0] ${model.name} API error - Response headers:`,
            JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2),
          )
          throw new Error(`${model.name} API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        let data
        try {
          const responseText = await response.text()
          console.log(`[v0] ${model.name} raw response:`, responseText.substring(0, 200) + "...")

          // Try to parse as JSON first
          try {
            data = JSON.parse(responseText)
          } catch (jsonError) {
            console.log(`[v0] ${model.name} response is not JSON, treating as plain text`)
            // If it's not JSON, create a mock response structure
            data = {
              text: responseText,
              response: responseText,
              content: responseText,
            }
          }
        } catch (textError) {
          console.error(`[v0] Failed to read ${model.name} response:`, textError)
          throw new Error(`Failed to read ${model.name} response`)
        }

        const parsedResponse = model.parseResponse(data)

        console.log(`[v0] ${model.name} response received for user ${user.id}`)
        console.log(
          `[v0] Token usage - Prompt: ${parsedResponse.usage.promptTokens}, Completion: ${parsedResponse.usage.completionTokens}, Total: ${parsedResponse.usage.totalTokens}`,
        )

        const inputCost = (parsedResponse.usage.promptTokens / 1000) * model.costPer1kTokens.input
        const outputCost = (parsedResponse.usage.completionTokens / 1000) * model.costPer1kTokens.output
        const totalCost = inputCost + outputCost

        await logUsage(
          user,
          modelId,
          parsedResponse.usage.promptTokens,
          parsedResponse.usage.completionTokens,
          totalCost,
        )

        return {
          modelId,
          modelName: model.name,
          response: parsedResponse.content,
          success: true,
          tokenUsage: parsedResponse.usage,
        }
      }),
    )

    const results = responses.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      } else {
        const modelId = models[index]
        const model = AI_MODELS_SERVER[modelId]
        console.log(`[v0] ${model?.name || modelId} failed for user ${user.id}:`, result.reason)

        logUsage(user, modelId, 0, 0, 0)

        return {
          modelId,
          modelName: model?.name || modelId,
          response: `Error: ${result.reason.message}`,
          success: false,
          error: result.reason.message,
          tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        }
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] API route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
