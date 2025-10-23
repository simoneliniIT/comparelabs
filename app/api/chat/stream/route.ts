import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkUsageLimit, logUsage, checkModelAccess, deductCreditsForComparison } from "@/lib/usage-tracking"
import { getServerAIModels, streamModelResponse } from "@/lib/ai-models-server"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { prompt, models, enableSummarization, summarizationModel } = await request.json()

    console.log("[v0] ========== NEW COMPARISON REQUEST ==========")
    console.log("[v0] Prompt:", prompt?.substring(0, 100) + "...")
    console.log("[v0] Models requested:", models)
    console.log("[v0] Number of models:", models?.length)
    console.log("[v0] Enable summarization:", enableSummarization)
    console.log("[v0] Summarization model:", summarizationModel)

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

        console.log("[v0] ========== STARTING MODEL PROCESSING ==========")
        console.log("[v0] Models to process:", models)
        console.log("[v0] Available AI models:", Object.keys(AI_MODELS))

        // Check if all requested models exist in AI_MODELS
        const missingModels = models.filter((modelId: string) => !AI_MODELS[modelId])
        if (missingModels.length > 0) {
          console.log("[v0] ⚠️  WARNING: Some requested models are not available:", missingModels)
        }

        // Process each model in parallel
        const modelPromises = models.map(async (modelId: string) => {
          const modelConfig = AI_MODELS[modelId]
          if (!modelConfig) {
            console.log(`[v0] ❌ Model not found in AI_MODELS: ${modelId}`)
            const errorEvent = `data: ${JSON.stringify({ type: "error", modelId, error: `Unknown model: ${modelId}` })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            return
          }

          console.log(`[v0] ✓ Model ${modelConfig.name} (${modelId}) found, starting processing...`)

          const modelTimeout = 45000 // 45 seconds per model
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Model response timeout")), modelTimeout)
          })

          try {
            console.log(`[v0] ========== STARTING ${modelConfig.name.toUpperCase()} ==========`)
            console.log(`[v0] Model ID: ${modelId}`)
            console.log(`[v0] Model string: ${modelConfig.modelString}`)
            console.log(`[v0] Timeout: ${modelTimeout}ms`)

            const result = await Promise.race([streamModelResponse(modelId, prompt, request.signal), timeoutPromise])

            let fullResponse = ""
            let promptTokens = 0
            let completionTokens = 0
            let finishReason = "unknown"
            let chunkCount = 0

            try {
              console.log(`[v0] ${modelConfig.name}: Starting stream consumption...`)
              for await (const chunk of result.textStream) {
                chunkCount++
                fullResponse += chunk

                // Log every 10th chunk to avoid spam
                if (chunkCount % 10 === 0) {
                  console.log(
                    `[v0] ${modelConfig.name}: Received chunk #${chunkCount}, total length: ${fullResponse.length} chars`,
                  )
                }

                const streamEvent = `data: ${JSON.stringify({
                  type: "chunk",
                  modelId,
                  modelName: modelConfig.name,
                  chunk,
                })}\n\n`
                controller.enqueue(encoder.encode(streamEvent))
              }

              console.log(`[v0] ========== ${modelConfig.name.toUpperCase()} STREAM LOOP COMPLETED ==========`)
              console.log(`[v0] Total chunks received: ${chunkCount}`)
              console.log(`[v0] Total response length: ${fullResponse.length} characters`)
              console.log(`[v0] Response preview (first 200 chars): ${fullResponse.substring(0, 200)}...`)
              console.log(
                `[v0] Response preview (last 200 chars): ...${fullResponse.substring(Math.max(0, fullResponse.length - 200))}`,
              )

              try {
                finishReason = (await result.finishReason) || "stop"
                console.log(`[v0] ${modelConfig.name}: Finish reason = "${finishReason}"`)
                if (finishReason === "length") {
                  console.log(`[v0] ⚠️  ${modelConfig.name} hit its natural token limit - response may be incomplete`)
                } else if (finishReason === "stop") {
                  console.log(`[v0] ✓ ${modelConfig.name} completed naturally`)
                }
              } catch (finishError) {
                console.error(`[v0] Error getting finish reason for ${modelConfig.name}:`, finishError)
              }
            } catch (streamError: any) {
              console.error(`[v0] ========== ${modelConfig.name.toUpperCase()} STREAM ERROR ==========`)
              console.error(`[v0] Error type: ${streamError.name}`)
              console.error(`[v0] Error message: ${streamError.message}`)
              console.error(`[v0] Error stack:`, streamError.stack)
              console.log(`[v0] Chunks received before error: ${chunkCount}`)
              console.log(`[v0] Partial response length: ${fullResponse.length} characters`)

              if (fullResponse.length > 0) {
                console.log(`[v0] Using partial response (${fullResponse.length} chars)`)
              } else {
                console.log(`[v0] No partial response available, throwing error`)
                throw streamError
              }
            }

            try {
              const usage = await result.usage
              console.log(`[v0] ${modelConfig.name}: Raw usage object:`, JSON.stringify(usage))

              if (usage) {
                promptTokens = usage.promptTokens || usage.inputTokens || 0
                completionTokens = usage.completionTokens || usage.outputTokens || 0
                console.log(
                  `[v0] ${modelConfig.name}: Prompt tokens: ${promptTokens}, Completion tokens: ${completionTokens}`,
                )

                if (completionTokens >= 16384) {
                  console.log(`[v0] ⚠️  ${modelConfig.name} generated ${completionTokens} tokens (very long response)`)
                }
              }
            } catch (usageError) {
              console.error(`[v0] Error getting usage for ${modelConfig.name}:`, usageError)
            }

            successfulResponses.push({
              modelId,
              modelName: modelConfig.name,
              response: fullResponse,
            })

            console.log(`[v0] ✓ ${modelConfig.name} added to successfulResponses array`)
            console.log(`[v0] Current successfulResponses count: ${successfulResponses.length}`)
            console.log(
              `[v0] Current successfulResponses models: ${successfulResponses.map((r) => r.modelName).join(", ")}`,
            )

            console.log(`[v0] ========== SENDING COMPLETE EVENT FOR ${modelConfig.name.toUpperCase()} ==========`)
            const completeEvent = `data: ${JSON.stringify({
              type: "complete",
              modelId,
              modelName: modelConfig.name,
              response: fullResponse,
              finishReason,
              tokenUsage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens,
              },
            })}\n\n`
            controller.enqueue(encoder.encode(completeEvent))
            console.log(`[v0] ✓ Complete event sent for ${modelConfig.name}`)

            const inputCost = (promptTokens / 1000000) * modelConfig.costPer1MTokens.input
            const outputCost = (completionTokens / 1000000) * modelConfig.costPer1MTokens.output
            const totalCost = inputCost + outputCost

            await logUsage(user, modelId, promptTokens, completionTokens, totalCost)
            console.log(`[v0] ✓ Usage logged for ${modelConfig.name}`)
          } catch (error: any) {
            console.error(`[v0] ========== ${modelConfig?.name || modelId} FAILED ==========`)
            console.error(`[v0] Error type: ${error.name}`)
            console.error(`[v0] Error message: ${error.message}`)
            console.error(`[v0] Is timeout: ${error.message === "Model response timeout"}`)

            const errorEvent = `data: ${JSON.stringify({
              type: "error",
              modelId,
              modelName: modelConfig.name,
              error:
                error.message === "Model response timeout" ? "Response took too long and was cancelled" : error.message,
            })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            console.log(`[v0] ✓ Error event sent for ${modelConfig.name}`)

            await logUsage(user, modelId, 0, 0, 0)
          }
        })

        await Promise.all(modelPromises)

        console.log("[v0] ========== ALL MODEL RESPONSES COMPLETE ==========")
        console.log("[v0] Enable summarization (raw value):", enableSummarization)
        console.log("[v0] Enable summarization (type):", typeof enableSummarization)
        console.log("[v0] Enable summarization (boolean check):", enableSummarization === true)
        console.log("[v0] Enable summarization (truthy check):", !!enableSummarization)
        console.log("[v0] Successful responses count:", successfulResponses.length)
        console.log("[v0] Successful responses models:", successfulResponses.map((r) => r.modelName).join(", "))
        console.log(
          "[v0] Successful responses details:",
          successfulResponses.map((r) => ({
            modelId: r.modelId,
            modelName: r.modelName,
            responseLength: r.response.length,
          })),
        )
        console.log("[v0] Summarization model:", summarizationModel)
        console.log("[v0] Condition check: enableSummarization && successfulResponses.length > 1")
        console.log("[v0] Condition result:", enableSummarization && successfulResponses.length > 1)

        const shouldGenerateSummary = !!enableSummarization && successfulResponses.length > 1
        console.log("[v0] Should generate summary (explicit):", shouldGenerateSummary)

        if (shouldGenerateSummary) {
          try {
            console.log(`[v0] ========== STARTING SUMMARY GENERATION ==========`)
            console.log(`[v0] Generating summary using ${summarizationModel || "chatgpt"}...`)

            const summaryPrompt = `You are a synthesis model that combines multiple AI-generated answers into one superior response.

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

2. Write a single **integrated "meta-answer"** that:
   - Captures the most accurate facts.
   - Includes the most insightful ideas or creative perspectives.
   - Reads fluently and naturally, as if written by one expert.
   - Avoids repetition, contradictions, or filler.

Provide a thorough analysis (aim for 300-500 words) that helps users understand the nuances between these AI models.`

            const summaryModelId = summarizationModel || "chatgpt"
            const summaryModelConfig = AI_MODELS[summaryModelId]

            if (summaryModelConfig) {
              const summaryResult = await streamModelResponse(summaryModelId, summaryPrompt, request.signal)
              let summaryText = ""
              let summaryPromptTokens = 0
              let summaryCompletionTokens = 0

              for await (const chunk of summaryResult.textStream) {
                summaryText += chunk
                console.log(`[v0] Summary chunk received (length: ${chunk.length})`)
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

              console.log(`[v0] ========== SUMMARY COMPLETE ==========`)
              console.log(`[v0] Total summary length: ${summaryText.length}`)
              console.log(`[v0] Summary preview: ${summaryText.substring(0, 100)}...`)
              const summaryEvent = `data: ${JSON.stringify({
                type: "summary",
                summary: summaryText,
              })}\n\n`
              controller.enqueue(encoder.encode(summaryEvent))

              const inputCost = (summaryPromptTokens / 1000000) * summaryModelConfig.costPer1MTokens.input
              const outputCost = (summaryCompletionTokens / 1000000) * summaryModelConfig.costPer1MTokens.output
              const totalCost = inputCost + outputCost
              await logUsage(user, `${summaryModelId}_summary`, summaryPromptTokens, summaryCompletionTokens, totalCost)

              console.log(`[v0] Summary generated successfully using ${summaryModelConfig.name}`)
            }
          } catch (error: any) {
            console.error(`[v0] ========== SUMMARY GENERATION FAILED ==========`)
            console.error(`[v0] Summary generation failed:`, error)
            console.error(`[v0] Error stack:`, error.stack)
            const summaryErrorEvent = `data: ${JSON.stringify({
              type: "summary-error",
              error: error.message,
            })}\n\n`
            controller.enqueue(encoder.encode(summaryErrorEvent))
          }
        } else {
          console.log("[v0] ========== SKIPPING SUMMARY GENERATION ==========")
          if (!enableSummarization) {
            console.log("[v0] Reason: Summarization disabled")
          } else if (successfulResponses.length <= 1) {
            console.log("[v0] Reason: Not enough successful responses (need 2+, got", successfulResponses.length, ")")
          }
        }

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
