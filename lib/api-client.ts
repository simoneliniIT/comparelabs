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

export async function submitToModelsStreaming(
  prompt: string,
  selectedModels: string[],
  options: ChatOptions & {
    onChunk?: (modelId: string, modelName: string, chunk: string) => void
    onComplete?: (modelId: string, modelName: string, response: string, tokenUsage?: any) => void
    onError?: (modelId: string, modelName: string, error: string) => void
    onSummary?: (summary: string) => void
  },
): Promise<void> {
  console.log("[v0] Submitting to models with streaming:", selectedModels)
  console.log("[v0] Options:", options)

  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      models: selectedModels,
      enableSummarization: options.enableSummarization,
      summarizationModel: options.summarizationModel,
    }),
  })

  if (!response.ok) {
    const data = await response.json()
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

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("No reader available")
  }

  const decoder = new TextDecoder()
  let buffer = ""
  let summaryBuffer = ""

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

            if (data.type === "chunk" && options.onChunk) {
              options.onChunk(data.modelId, data.modelName, data.chunk)
            } else if (data.type === "complete" && options.onComplete) {
              options.onComplete(data.modelId, data.modelName, data.response, data.tokenUsage)
            } else if (data.type === "error" && options.onError) {
              options.onError(data.modelId, data.modelName, data.error)
            } else if (data.type === "summary-chunk") {
              summaryBuffer += data.chunk
              if (options.onSummary) {
                options.onSummary(summaryBuffer)
              }
            } else if (data.type === "summary" && options.onSummary) {
              options.onSummary(data.summary)
            } else if (data.type === "summary-error") {
              console.error("[v0] Summary generation error:", data.error)
            } else if (data.type === "done") {
              console.log("[v0] Streaming complete")
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
