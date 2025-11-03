import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkUsageLimit, logUsage, checkModelAccess, deductCreditsForComparison } from "@/lib/usage-tracking"
import { getServerAIModels, streamModelResponse } from "@/lib/ai-models-server"

export const maxDuration = 60

const QUICK_TIER_MODELS = ["llama-4-maverick", "grok-4-fast-reasoning", "gemini-2.5-flash-lite", "gpt-4.1-nano"]
const FREE_TRY_LIMIT = 3 // Allow 3 free tries per IP per day
const FREE_TRY_WINDOW_HOURS = 24

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

    const isAuthenticated = !authError && !!user
    console.log("[v0] User authenticated:", isAuthenticated)

    if (!isAuthenticated) {
      const hasNonQuickModels = models.some((modelId: string) => !QUICK_TIER_MODELS.includes(modelId))
      if (hasNonQuickModels) {
        console.log("[v0] Unauthenticated user attempted to use non-quick tier models")
        return new Response(
          JSON.stringify({
            error: "Please sign up to access premium models",
            allowedModels: QUICK_TIER_MODELS,
          }),
          { status: 403 },
        )
      }

      const ipAddress =
        request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"
      const userAgent = request.headers.get("user-agent") || "unknown"

      console.log("[v0] Checking rate limit for IP:", ipAddress)

      // Check how many free tries this IP has used in the last 24 hours
      const windowStart = new Date(Date.now() - FREE_TRY_WINDOW_HOURS * 60 * 60 * 1000).toISOString()

      const { data: recentTries, error: rateLimitError } = await supabase
        .from("free_try_logs")
        .select("id")
        .eq("ip_address", ipAddress)
        .gte("created_at", windowStart)

      if (rateLimitError) {
        console.error("[v0] Error checking rate limit:", rateLimitError)
        // Continue anyway - don't block users if rate limit check fails
      } else if (recentTries && recentTries.length >= FREE_TRY_LIMIT) {
        console.log(`[v0] IP ${ipAddress} has exceeded free try limit (${recentTries.length}/${FREE_TRY_LIMIT})`)
        return new Response(
          JSON.stringify({
            error: `You've used all ${FREE_TRY_LIMIT} free tries. Sign up for free to continue comparing AI models!`,
            rateLimitExceeded: true,
          }),
          { status: 429 },
        )
      }

      console.log(`[v0] IP ${ipAddress} has used ${recentTries?.length || 0}/${FREE_TRY_LIMIT} free tries`)

      const { error: logError } = await supabase.from("free_try_logs").insert({
        ip_address: ipAddress,
        user_agent: userAgent,
        prompt: prompt.substring(0, 500), // Store first 500 chars
        models_used: models,
      })

      if (logError) {
        console.error("[v0] Error logging free try:", logError)
        // Continue anyway - don't block users if logging fails
      } else {
        console.log("[v0] Free try logged successfully")
      }

      console.log("[v0] Allowing unauthenticated request with quick tier models only")
    } else {
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
          const modelStartTime = Date.now()
          const modelConfig = AI_MODELS[modelId]
          if (!modelConfig) {
            console.log(`[v0] ❌ Model not found in AI_MODELS: ${modelId}`)
            const errorEvent = `data: ${JSON.stringify({ type: "error", modelId, error: `Unknown model: ${modelId}` })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            return
          }

          console.log(`[v0] ✓ Model ${modelConfig.name} (${modelId}) found, starting processing at ${modelStartTime}`)

          const modelTimeout = 45000 // 45 seconds per model
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Model response timeout")), modelTimeout)
          })

          try {
            console.log(`[v0] ========== STARTING ${modelConfig.name.toUpperCase()} ==========`)
            console.log(`[v0] Model ID: ${modelId}`)
            console.log(`[v0] Model string: ${modelConfig.modelString}`)
            console.log(`[v0] Timeout: ${modelTimeout}ms`)
            console.log(`[v0] ⏱️  ${modelConfig.name}: Calling streamModelResponse at ${Date.now() - modelStartTime}ms`)

            let result
            try {
              result = await Promise.race([streamModelResponse(modelId, prompt, request.signal), timeoutPromise])
              console.log(`[v0] ⏱️  ${modelConfig.name}: Stream initialized after ${Date.now() - modelStartTime}ms`)
            } catch (initError: any) {
              console.error(
                `[v0] ❌ ${modelConfig.name} failed to initialize after ${Date.now() - modelStartTime}ms:`,
                initError.message,
              )
              console.error(`[v0] Error stack:`, initError.stack)
              throw initError
            }

            let fullResponse = ""
            let promptTokens = 0
            let completionTokens = 0
            let finishReason = "unknown"
            let chunkCount = 0
            let receivedFirstChunk = false // Add a flag to track if we received any chunks

            try {
              console.log(`[v0] ${modelConfig.name}: Starting stream consumption...`)
              for await (const chunk of result.textStream) {
                if (!receivedFirstChunk) {
                  console.log(`[v0] ${modelConfig.name}: ✓ First chunk received!`)
                  receivedFirstChunk = true
                }
                chunkCount++
                fullResponse += chunk

                console.log(`[v0] Stream chunk from ${modelConfig.name}: ${chunk}`)

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
              console.log(`[v0] Received first chunk: ${receivedFirstChunk}`)

              if (fullResponse.length === 0) {
                console.error(`[v0] ❌ ${modelConfig.name} completed but produced NO CONTENT`)
                console.error(`[v0] This usually means:`)
                console.error(`[v0]   1. The model string "${modelConfig.modelString}" is invalid or not supported`)
                console.error(`[v0]   2. There's an API authentication issue`)
                console.error(`[v0]   3. The model refused to generate content`)
                console.error(`[v0]   4. The AI Gateway returned an error that wasn't caught`)

                try {
                  finishReason = await result.finishReason
                  console.error(`[v0] Finish reason: ${finishReason}`)

                  const usage = await result.usage
                  console.error(`[v0] Usage:`, usage)

                  // Check if there's a response object with error details
                  const response = await result.response
                  console.error(`[v0] Response object:`, response)
                } catch (detailError: any) {
                  console.error(`[v0] Could not get additional error details:`, detailError.message)
                }

                // Send error event to client
                const errorEvent = `data: ${JSON.stringify({
                  type: "error",
                  modelId,
                  modelName: modelConfig.name,
                  error: `${modelConfig.name} produced no content. The model may not be available or the model string "${modelConfig.modelString}" may be invalid.`,
                })}\n\n`
                controller.enqueue(encoder.encode(errorEvent))

                if (isAuthenticated && user) {
                  await logUsage(user, modelId, 0, 0, 0)
                }

                // Return early without adding to successfulResponses
                return
              }

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

            if (isAuthenticated && user) {
              const inputCost = (promptTokens / 1000000) * modelConfig.costPer1MTokens.input
              const outputCost = (completionTokens / 1000000) * modelConfig.costPer1MTokens.output
              const totalCost = inputCost + outputCost

              await logUsage(user, modelId, promptTokens, completionTokens, totalCost)
              console.log(`[v0] ✓ Usage logged for ${modelConfig.name}`)
            } else {
              // Log free try usage with cost tracking
              const inputCost = (promptTokens / 1000000) * modelConfig.costPer1MTokens.input
              const outputCost = (completionTokens / 1000000) * modelConfig.costPer1MTokens.output
              const totalCost = inputCost + outputCost

              const ipAddress =
                request.headers.get("x-forwarded-for")?.split(",")[0] || request.headers.get("x-real-ip") || "unknown"

              // Update the free_try_logs entry with cost data
              const { error: updateError } = await supabase
                .from("free_try_logs")
                .update({
                  cost_usd: totalCost,
                  prompt_tokens: promptTokens,
                  completion_tokens: completionTokens,
                  total_tokens: promptTokens + completionTokens,
                })
                .eq("ip_address", ipAddress)
                .order("created_at", { ascending: false })
                .limit(1)

              if (updateError) {
                console.error(`[v0] Error updating free try cost:`, updateError)
              } else {
                console.log(`[v0] ✓ Free try cost logged for IP ${ipAddress}: $${totalCost.toFixed(6)}`)
              }
            }
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

            if (isAuthenticated && user) {
              await logUsage(user, modelId, 0, 0, 0)
            }
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
        console.log("[v0] Condition check: enableSummarization && successfulResponses.length >= 2")
        console.log("[v0] Condition result:", enableSummarization && successfulResponses.length >= 2)

        const shouldGenerateSummary = isAuthenticated && !!enableSummarization && successfulResponses.length >= 2
        console.log("[v0] Should generate summary (explicit):", shouldGenerateSummary)

        if (shouldGenerateSummary && user) {
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
          if (!isAuthenticated) {
            console.log("[v0] Reason: User not authenticated")
          } else if (!enableSummarization) {
            console.log("[v0] Reason: Summarization disabled")
          } else if (successfulResponses.length < 2) {
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
