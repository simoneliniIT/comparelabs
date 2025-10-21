export interface AIModel {
  id: string
  name: string
  description: string
  gradient: string
  icon: string
  bucket: "performance" | "medium" | "quick"
  isDefault?: boolean
}

export const AI_MODELS: Record<string, AIModel> = {
  // Performance bucket (frontier reasoning + strongest outputs)
  "gpt-5": {
    id: "gpt-5",
    name: "GPT-5",
    description: "OpenAI GPT-5",
    gradient: "chatgpt-gradient",
    icon: "🤖",
    bucket: "performance",
    isDefault: true,
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google Gemini 2.5 Pro",
    gradient: "gemini-gradient",
    icon: "✨",
    bucket: "performance",
    isDefault: true,
  },
  "claude-sonnet-4.5": {
    id: "claude-sonnet-4.5",
    name: "Claude Sonnet 4.5",
    description: "Anthropic Claude Sonnet 4.5",
    gradient: "claude-gradient",
    icon: "🧠",
    bucket: "performance",
    isDefault: true,
  },
  "grok-4": {
    id: "grok-4",
    name: "Grok 4",
    description: "xAI Grok 4",
    gradient: "from-purple-500 to-pink-500",
    icon: "⚡",
    bucket: "performance",
    isDefault: true,
  },

  // Medium bucket (solid capability, balanced pricing)
  "gpt-5-mini": {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "OpenAI GPT-5 Mini",
    gradient: "chatgpt-gradient",
    icon: "🤖",
    bucket: "medium",
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google Gemini 2.5 Flash",
    gradient: "gemini-gradient",
    icon: "✨",
    bucket: "medium",
  },
  "deepseek-v3.2-exp": {
    id: "deepseek-v3.2-exp",
    name: "DeepSeek v3.2 Exp",
    description: "DeepSeek v3.2 Experimental",
    gradient: "from-indigo-500 to-purple-500",
    icon: "🔬",
    bucket: "medium",
  },
  "claude-3.5-haiku": {
    id: "claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    description: "Anthropic Claude 3.5 Haiku",
    gradient: "claude-gradient",
    icon: "🧠",
    bucket: "medium",
  },

  // Quick & Cheap bucket (best efficiency / scale)
  "llama-4-maverick": {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    description: "Meta Llama 4 Maverick",
    gradient: "from-blue-500 to-cyan-500",
    icon: "🦙",
    bucket: "quick",
  },
  "grok-4-fast-reasoning": {
    id: "grok-4-fast-reasoning",
    name: "Grok 4 Fast Reasoning",
    description: "xAI Grok 4 Fast Reasoning",
    gradient: "from-purple-500 to-pink-500",
    icon: "⚡",
    bucket: "quick",
  },
  "gemini-2.5-flash-lite": {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Google Gemini 2.5 Flash Lite",
    gradient: "gemini-gradient",
    icon: "✨",
    bucket: "quick",
  },
  "gpt-4.1-nano": {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    description: "OpenAI GPT-4.1 Nano",
    gradient: "chatgpt-gradient",
    icon: "🤖",
    bucket: "quick",
  },
}

export function getDefaultModels(): string[] {
  return Object.values(AI_MODELS)
    .filter((model) => model.isDefault)
    .map((model) => model.id)
}

export function getModelsByBucket(bucket: "performance" | "medium" | "quick"): AIModel[] {
  return Object.values(AI_MODELS).filter((model) => model.bucket === bucket)
}
