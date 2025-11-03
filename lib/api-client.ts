export interface ModelResponse {
  modelId: string
  modelName: string
  response: string
  success: boolean
  error?: string
}

export interface ChatResponse {
  results: ModelResponse[]
  error?: string
  remainingQueries?: number
  remainingCredits?: number // Added remaining credits to response interface
  resetDate?: string
  allowedModels?: string[]
}

export interface ChatOptions {
  enableSummarization?: boolean
  summarizationModel?: string
}

export async function submitToModels(
  prompt: string,
  selectedModels: string[],
  options?: ChatOptions,
): Promise<ChatResponse> {
  console.log("[v0] Submitting to models:", selectedModels)
  console.log("[v0] Options:", options)

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      models: selectedModels,
      ...options,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Please sign in to use CompareLabs.ai")
    } else if (response.status === 403) {
      throw new Error(data.error || "Access denied to selected models")
    } else if (response.status === 429) {
      const resetDate = data.resetDate ? new Date(data.resetDate).toLocaleDateString() : "tomorrow"
      const creditsInfo =
        data.remainingCredits !== undefined ? ` You have ${data.remainingCredits} credits remaining.` : ""
      throw new Error(data.error + creditsInfo || `Usage limit exceeded. Resets ${resetDate}`)
    } else {
      throw new Error(data.error || `API request failed: ${response.status} ${response.statusText}`)
    }
  }

  console.log("[v0] API response received:", data)
  return data
}

export interface StreamingOptions {
  enableSummarization?: boolean
  summarizationModel?: string
  onChunk: (modelId: string, modelName: string, chunk: string) => void
  onComplete: (modelId: string, modelName: string, response: string) => void
  onError: (modelId: string, modelName: string, error: string) => void
  onSummaryChunk?: (chunk: string) => void
}

export async function submitToModelsStreaming(
  prompt: string,
  selectedModels: string[],
  options: StreamingOptions,
): Promise<void> {
  const { enableSummarization = false, summarizationModel, onChunk, onComplete, onError, onSummaryChunk } = options

  console.log("[v0] ========== STARTING STREAMING REQUEST ==========")
  console.log("[v0] Selected models:", selectedModels)
  console.log("[v0] Summarization enabled:", enableSummarization)
  console.log("[v0] Summarization model:", summarizationModel)

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      models: selectedModels,
      enableSummarization,
      summarizationModel,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    if (response.status === 401) {
      throw new Error("Please sign in to use CompareLabs.ai")
    } else if (response.status === 403) {
      throw new Error(data.error || "Access denied to selected models")
    } else if (response.status === 429) {
      // Check if this is a rate limit error for free tries
      if (data.rateLimitExceeded) {
        throw new Error(data.error || "You've used all your free tries. Sign up to continue!")
      }
      const resetDate = data.resetDate ? new Date(data.resetDate).toLocaleDateString() : "tomorrow"
      const creditsInfo =
        data.remainingCredits !== undefined ? ` You have ${data.remainingCredits} credits remaining.` : ""
      throw new Error(data.error + creditsInfo || `Usage limit exceeded. Resets ${resetDate}`)
    } else {
      throw new Error(data.error || `API request failed: ${response.status} ${response.statusText}`)
    }
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("No reader available")
  }

  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === "chunk") {
              console.log(`[v0] Stream chunk from ${data.modelName}:`, data.chunk)
              onChunk(data.modelId, data.modelName, data.chunk)
            } else if (data.type === "complete") {
              onComplete(data.modelId, data.modelName, data.response)
            } else if (data.type === "error") {
              onError(data.modelId, data.modelName, data.error)
            } else if (data.type === "summary-chunk" && onSummaryChunk) {
              onSummaryChunk(data.chunk)
            } else if (data.type === "summary") {
              console.log("[v0] ========== COMPLETE SUMMARY RECEIVED ==========")
              console.log("[v0] Summary length:", data.summary.length)
            } else if (data.type === "summary-error") {
              console.error("[v0] ========== SUMMARY ERROR ==========")
              console.error("[v0] Error:", data.error)
            } else if (data.type === "done") {
              console.log("[v0] ========== STREAMING COMPLETE ==========")
            }
          } catch (e) {
            console.error("[v0] Failed to parse SSE data:", e)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
