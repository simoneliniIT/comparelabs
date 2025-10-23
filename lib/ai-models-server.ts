import { streamText } from "ai"
import { createGateway } from "@ai-sdk/gateway"

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: "https://ai-gateway.vercel.sh/v1/ai",
})

export interface AIModelConfig {
  id: string
  name: string
  description: string
  gradient: string
  icon: string
  modelString: string // AI SDK model string (e.g., "openai/gpt-5")
  contextWindow: number // in tokens
  costPer1MTokens: {
    input: number
    output: number
  }
  bucket: "performance" | "medium" | "quick"
  isDefault?: boolean
  creditsPerQuestion: number
}

export function getServerAIModels(): Record<string, AIModelConfig> {
  return {
    // Performance bucket (frontier reasoning + strongest outputs)
    "gpt-5": {
      id: "gpt-5",
      name: "GPT-5",
      description: "OpenAI GPT-5",
      gradient: "chatgpt-gradient",
      icon: "🤖",
      modelString: "openai/gpt-5",
      contextWindow: 400000,
      costPer1MTokens: {
        input: 1.25,
        output: 10.0,
      },
      bucket: "performance",
      isDefault: true,
      creditsPerQuestion: 25,
    },
    "gemini-2.5-pro": {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description: "Google Gemini 2.5 Pro",
      gradient: "gemini-gradient",
      icon: "✨",
      modelString: "google/gemini-2.5-pro",
      contextWindow: 1000000,
      costPer1MTokens: {
        input: 1.25,
        output: 10.0,
      },
      bucket: "performance",
      isDefault: true,
      creditsPerQuestion: 25,
    },
    "claude-sonnet-4.5": {
      id: "claude-sonnet-4.5",
      name: "Claude Sonnet 4.5",
      description: "Anthropic Claude Sonnet 4.5",
      gradient: "claude-gradient",
      icon: "🧠",
      modelString: "anthropic/claude-sonnet-4.5",
      contextWindow: 200000,
      costPer1MTokens: {
        input: 3.0,
        output: 15.0,
      },
      bucket: "performance",
      isDefault: true,
      creditsPerQuestion: 25,
    },
    "grok-4": {
      id: "grok-4",
      name: "Grok 4",
      description: "xAI Grok 4",
      gradient: "from-purple-500 to-pink-500",
      icon: "⚡",
      modelString: "xai/grok-4",
      contextWindow: 256000,
      costPer1MTokens: {
        input: 3.0,
        output: 15.0,
      },
      bucket: "performance",
      isDefault: true,
      creditsPerQuestion: 25,
    },

    // Medium bucket (solid capability, balanced pricing)
    "gpt-5-mini": {
      id: "gpt-5-mini",
      name: "GPT-5 Mini",
      description: "OpenAI GPT-5 Mini",
      gradient: "chatgpt-gradient",
      icon: "🤖",
      modelString: "openai/gpt-5-mini",
      contextWindow: 400000,
      costPer1MTokens: {
        input: 0.25,
        output: 2.0,
      },
      bucket: "medium",
      creditsPerQuestion: 5,
    },
    "grok-4-medium": {
      id: "grok-4-medium",
      name: "Grok 4 Medium",
      description: "xAI Grok 4 Medium",
      gradient: "from-purple-500 to-pink-500",
      icon: "⚡",
      modelString: "xai/grok-4-medium",
      contextWindow: 200000,
      costPer1MTokens: {
        input: 3.0,
        output: 15.0,
      },
      bucket: "medium",
      creditsPerQuestion: 5,
    },
    "gemini-2.5-flash": {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Google Gemini 2.5 Flash",
      gradient: "gemini-gradient",
      icon: "✨",
      modelString: "google/gemini-2.5-flash",
      contextWindow: 1000000,
      costPer1MTokens: {
        input: 0.3,
        output: 2.5,
      },
      bucket: "medium",
      creditsPerQuestion: 5,
    },
    "deepseek-v3.2-exp": {
      id: "deepseek-v3.2-exp",
      name: "DeepSeek v3.2 Exp",
      description: "DeepSeek v3.2 Experimental",
      gradient: "from-indigo-500 to-purple-500",
      icon: "🔬",
      modelString: "deepseek/deepseek-v3.2-exp",
      contextWindow: 164000,
      costPer1MTokens: {
        input: 0.27,
        output: 0.41,
      },
      bucket: "medium",
      creditsPerQuestion: 5,
    },
    "claude-3.5-haiku": {
      id: "claude-3.5-haiku",
      name: "Claude 3.5 Haiku",
      description: "Anthropic Claude 3.5 Haiku",
      gradient: "claude-gradient",
      icon: "🧠",
      modelString: "anthropic/claude-3.5-haiku",
      contextWindow: 200000,
      costPer1MTokens: {
        input: 0.8,
        output: 4.0,
      },
      bucket: "medium",
      creditsPerQuestion: 5,
    },

    // Quick & Cheap bucket (best efficiency / scale)
    "llama-4-maverick": {
      id: "llama-4-maverick",
      name: "Llama 4 Maverick",
      description: "Meta Llama 4 Maverick",
      gradient: "from-blue-500 to-cyan-500",
      icon: "🦙",
      modelString: "meta/llama-4-maverick",
      contextWindow: 1300000,
      costPer1MTokens: {
        input: 0.15,
        output: 0.6,
      },
      bucket: "quick",
      creditsPerQuestion: 1,
    },
    "grok-4-fast-reasoning": {
      id: "grok-4-fast-reasoning",
      name: "Grok 4 Fast Reasoning",
      description: "xAI Grok 4 Fast Reasoning",
      gradient: "from-purple-500 to-pink-500",
      icon: "⚡",
      modelString: "xai/grok-4-fast-reasoning",
      contextWindow: 2000000,
      costPer1MTokens: {
        input: 0.2,
        output: 0.5,
      },
      bucket: "quick",
      creditsPerQuestion: 1,
    },
    "gemini-2.5-flash-lite": {
      id: "gemini-2.5-flash-lite",
      name: "Gemini 2.5 Flash Lite",
      description: "Google Gemini 2.5 Flash Lite",
      gradient: "gemini-gradient",
      icon: "✨",
      modelString: "google/gemini-2.5-flash-lite",
      contextWindow: 1000000,
      costPer1MTokens: {
        input: 0.1,
        output: 0.4,
      },
      bucket: "quick",
      creditsPerQuestion: 1,
    },
    "gpt-4.1-nano": {
      id: "gpt-4.1-nano",
      name: "GPT-4.1 Nano",
      description: "OpenAI GPT-4.1 Nano",
      gradient: "chatgpt-gradient",
      icon: "🤖",
      modelString: "openai/gpt-4.1-nano",
      contextWindow: 1000000,
      costPer1MTokens: {
        input: 0.1,
        output: 0.4,
      },
      bucket: "quick",
      creditsPerQuestion: 1,
    },
  }
}

export async function streamModelResponse(modelId: string, prompt: string, signal?: AbortSignal) {
  const models = getServerAIModels()
  const model = models[modelId]

  if (!model) {
    throw new Error(`Unknown model: ${modelId}`)
  }

  console.log(`[v0] Streaming ${model.name} using AI Gateway with model string: ${model.modelString}`)
  console.log(`[v0] AI Gateway API Key configured: ${process.env.AI_GATEWAY_API_KEY ? "YES" : "NO"}`)

  const result = streamText({
    model: gateway(model.modelString),
    prompt,
    maxTokens: 8192, // ~6000 words - plenty for detailed responses without becoming unwieldy
    temperature: 0.7,
    abortSignal: signal,
  })

  return result
}
