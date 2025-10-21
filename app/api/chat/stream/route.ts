import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkUsageLimit, logUsage, checkModelAccess, deductCreditsForComparison } from "@/lib/usage-tracking"
import { getServerAIModels, streamModelResponse } from "@/lib/ai-models-server"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { prompt, models, enableSummarization, summarizationModel } = await request.json()

    if (!prompt || !models || !Array.isArray(models)) {
      return new Response(JSON.stringify({ error: "Invalid request parameters" }), { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 })
    }

    const modelAccess = await checkModelAccess(user, models)
    if (!modelAccess.allowed) {
      return new Response(
        JSON.stringify({
          error: modelAccess.reason,
          allowedModels: modelAccess.allowedModels,
        }),
        { status: 403 },
      )
    }

    const usageCheck = await checkUsageLimit(user, models)
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: usageCheck.reason,
          remainingCredits: usageCheck.remainingCredits,
        }),
        { status: 429 },
      )
    }

    try {
      await deductCreditsForComparison(user, models)
      console.log(`[v0] Successfully deducted credits for user ${user.id}`)
    } catch (error) {
      console.error(`[v0] Failed to deduct credits for user ${user.id}:`, error)
      return new Response(JSON.stringify({ error: "Failed to deduct credits. Please try again." }), { status: 500 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const AI_MODELS = getServerAIModels()
        const successfulResponses: Array<{ modelId: string; modelName: string; response: string }> = []

        // Process each model in parallel
        const modelPromises = models.map(async (modelId: string) => {
          const modelConfig = AI_MODELS[modelId]
          if (!modelConfig) {
            const errorEvent = `data: ${JSON.stringify({ type: "error", modelId, error: `Unknown model: ${modelId}` })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            return
          }

          try {
            console.log(`[v0] Calling ${modelConfig.name} via AI SDK for user ${user.id}...`)

            const result = await streamModelResponse(modelId, prompt, request.signal)
            let fullResponse = ""
            let promptTokens = 0
            let completionTokens = 0

            // Stream the response chunks
            for await (const chunk of result.textStream) {
              fullResponse += chunk
              const streamEvent = `data: ${JSON.stringify({
                type: "chunk",
                modelId,
                modelName: modelConfig.name,
                chunk,
              })}\n\n`
              controller.enqueue(encoder.encode(streamEvent))
            }

            try {
              const usage = await result.usage
              console.log(`[v0] Usage object for ${modelConfig.name}:`, JSON.stringify(usage))

              if (usage) {
                promptTokens = usage.promptTokens || usage.inputTokens || 0
                completionTokens = usage.completionTokens || usage.outputTokens || 0
              }
            } catch (usageError) {
              console.error(`[v0] Error getting usage for ${modelConfig.name}:`, usageError)
              // Continue without usage data
            }

            successfulResponses.push({
              modelId,
              modelName: modelConfig.name,
              response: fullResponse,
            })

            // Send complete event
            const completeEvent = `data: ${JSON.stringify({
              type: "complete",
              modelId,
              modelName: modelConfig.name,
              response: fullResponse,
              tokenUsage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
              },
            })}\n\n`
            controller.enqueue(encoder.encode(completeEvent))

            const inputCost = (promptTokens / 1000000) * modelConfig.costPer1MTokens.input
            const outputCost = (completionTokens / 1000000) * modelConfig.costPer1MTokens.output
            const totalCost = inputCost + outputCost

            await logUsage(user, modelId, promptTokens, completionTokens, totalCost)
          } catch (error: any) {
            console.error(`[v0] ${modelConfig?.name || modelId} failed for user ${user.id}:`, error)
            const errorEvent = `data: ${JSON.stringify({
              type: "error",
              modelId,
              modelName: modelConfig.name,
              error: error.message,
            })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            await logUsage(user, modelId, 0, 0, 0)
          }
        })

        await Promise.all(modelPromises)

        if (enableSummarization && successfulResponses.length > 1) {
          try {
            console.log(`[v0] Generating summary using ${summarizationModel || "chatgpt"}...`)

            const summaryPrompt = `You are a synthesis model that combines multiple AI-generated answers into one superior response.
.

Original Question: ${prompt}

Model Responses:
${successfulResponses
  .map((r) => {
    return `**${r.modelName}**:\n${r.response}`
  })
  .join("\n\n---\n\n")}

Task:
1. Read all answers carefully and identify:
   - Common points of agreement.
   - Unique insights worth preserving.
   - Any factual contradictions.

2. Write a single **integrated “meta-answer”** that:
   - Captures the most accurate facts.
   - Includes the most insightful ideas or creative perspectives.
   - Reads fluently and naturally, as if written by one expert.
   - Avoids repetition, contradictions, or filler.

3. After the answer, include a short “analysis” section (max 50 words):
   > *Why this is the best synthesis*
   Example: “Blends GPT-5’s clarity, Claude’s reasoning depth, and Gemini’s factual precision.”

Provide a thorough analysis (aim for 300-500 words) that helps users understand the nuances between these AI models.`

            const summaryModelId = summarizationModel || "chatgpt"
            const summaryModelConfig = AI_MODELS[summaryModelId]

            if (summaryModelConfig) {
              const summaryResult = await streamModelResponse(summaryModelId, summaryPrompt, request.signal)
              let summaryText = ""
              let summaryPromptTokens = 0
              let summaryCompletionTokens = 0

              // Stream the summary chunks
              for await (const chunk of summaryResult.textStream) {
                summaryText += chunk
                const summaryChunkEvent = `data: ${JSON.stringify({
                  type: "summary-chunk",
                  chunk,
                })}\n\n`
                controller.enqueue(encoder.encode(summaryChunkEvent))
              }

              try {
                const usage = await summaryResult.usage
                if (usage) {
                  summaryPromptTokens = usage.promptTokens || usage.inputTokens || 0
                  summaryCompletionTokens = usage.completionTokens || usage.outputTokens || 0
                }
              } catch (usageError) {
                console.error(`[v0] Error getting summary usage:`, usageError)
              }

              // Send complete summary event
              const summaryEvent = `data: ${JSON.stringify({
                type: "summary",
                summary: summaryText,
              })}\n\n`
              controller.enqueue(encoder.encode(summaryEvent))

              // Log usage for summary (no additional credit deduction, just for tracking)
              const inputCost = (summaryPromptTokens / 1000000) * summaryModelConfig.costPer1MTokens.input
              const outputCost = (summaryCompletionTokens / 1000000) * summaryModelConfig.costPer1MTokens.output
              const totalCost = inputCost + outputCost
              await logUsage(user, `${summaryModelId}_summary`, summaryPromptTokens, summaryCompletionTokens, totalCost)

              console.log(`[v0] Summary generated successfully using ${summaryModelConfig.name}`)
            }
          } catch (error: any) {
            console.error(`[v0] Summary generation failed:`, error)
            // Don't fail the entire request if summary fails
            const summaryErrorEvent = `data: ${JSON.stringify({
              type: "summary-error",
              error: error.message,
            })}\n\n`
            controller.enqueue(encoder.encode(summaryErrorEvent))
          }
        }

        // Send done event
        const doneEvent = `data: ${JSON.stringify({ type: "done" })}\n\n`
        controller.enqueue(encoder.encode(doneEvent))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] API route error:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}
