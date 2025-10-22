"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { submitToModels, submitToModelsStreaming, type ModelResponse } from "@/lib/api-client"
import { AI_MODELS } from "@/lib/ai-config"
import { createClient } from "@/lib/supabase/client"
import { Coins, AlertCircle } from "lucide-react"

interface PromptInputProps {
  selectedModels: string[]
  enableSummarization: boolean
  summarizationModel: string
  onResponsesReceived: (responses: ModelResponse[], prompt: string) => void
  onSubmissionStart: (prompt: string) => Promise<void>
  onError: (error: string) => void
  onStreamChunk?: (modelId: string, modelName: string, chunk: string) => void
  onStreamComplete?: (modelId: string, modelName: string, response: string, tokenUsage?: any) => void
  onStreamError?: (modelId: string, modelName: string, error: string) => void
  onSummary?: (summary: string) => void
  useStreaming?: boolean
}

const CREDITS_PER_BUCKET = {
  performance: 25,
  medium: 5,
  quick: 1,
}

export function PromptInput({
  selectedModels,
  enableSummarization,
  summarizationModel,
  onResponsesReceived,
  onSubmissionStart,
  onError,
  onStreamChunk,
  onStreamComplete,
  onStreamError,
  onSummary,
  useStreaming = true,
}: PromptInputProps) {
  const [prompt, setPrompt] = useState("")
  const [autoSubmit, setAutoSubmit] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableCredits, setAvailableCredits] = useState<number | null>(null)

  useEffect(() => {
    const fetchCredits = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single()

      if (profile) {
        setAvailableCredits(profile.credits)
      }
    }

    fetchCredits()
  }, [])

  const handleSubmit = async () => {
    if (!prompt.trim() || selectedModels.length === 0) return

    setIsLoading(true)
    const currentPrompt = prompt.trim()

    console.log("[v0] PROMPT INPUT - Calling onSubmissionStart and waiting for topic creation...")
    await onSubmissionStart(currentPrompt)
    console.log("[v0] PROMPT INPUT - onSubmissionStart completed, topic should be created now")

    console.log("[v0] Submitting prompt:", currentPrompt)
    console.log("[v0] Summarization enabled:", enableSummarization, "Model:", summarizationModel)

    try {
      if (useStreaming && onStreamChunk && onStreamComplete && onStreamError) {
        console.log("[v0] PROMPT INPUT - Starting streaming...")
        await submitToModelsStreaming(currentPrompt, selectedModels, {
          enableSummarization,
          summarizationModel,
          onChunk: onStreamChunk,
          onComplete: onStreamComplete,
          onError: onStreamError,
          onSummary,
        })
      } else {
        const response = await submitToModels(currentPrompt, selectedModels, {
          enableSummarization,
          summarizationModel,
        })
        onResponsesReceived(response.results, currentPrompt)
      }
    } catch (error) {
      console.error("[v0] Submission error:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred"
      onError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const totalCredits = selectedModels.reduce((sum, modelId) => {
    const model = AI_MODELS[modelId]
    if (!model) return sum
    return sum + CREDITS_PER_BUCKET[model.bucket]
  }, 0)

  const remainingCredits = availableCredits !== null ? availableCredits - totalCredits : null
  const hasInsufficientCredits = remainingCredits !== null && remainingCredits < 0

  return (
    <section className="mb-8 sm:mb-10 md:mb-12 w-full max-w-full">
      <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-6 md:p-8 lg:p-12 shadow-lg w-full max-w-full">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center break-words">Ask Your Question</h2>

        <div className="space-y-4 sm:space-y-6 w-full max-w-full">
          <Textarea
            placeholder="Enter your prompt here... (e.g., 'Explain quantum computing in simple terms')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-24 sm:min-h-32 text-base sm:text-lg resize-none bg-background border-border w-full"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && autoSubmit) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-submit"
                  checked={autoSubmit}
                  onCheckedChange={(checked) => setAutoSubmit(checked as boolean)}
                  disabled={isLoading}
                />
                <label htmlFor="auto-submit" className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  Auto-submit on Enter
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-semibold text-foreground">{totalCredits}</span>
                  <span className="text-muted-foreground whitespace-nowrap">credits</span>
                </div>

                {remainingCredits !== null && (
                  <div
                    className={`flex items-center gap-1.5 text-xs sm:text-sm ${
                      hasInsufficientCredits ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {hasInsufficientCredits && <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />}
                    <span>→</span>
                    <span className="font-semibold">{Math.max(0, remainingCredits)}</span>
                    <span className="whitespace-nowrap">remaining</span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || selectedModels.length === 0 || isLoading || hasInsufficientCredits}
              className="gradient-bg hover:opacity-90 px-4 sm:px-8 w-full sm:w-auto text-sm sm:text-base whitespace-nowrap"
            >
              {isLoading ? "Sending..." : <span className="hidden sm:inline">Send to All Models</span>}
              {isLoading ? "" : <span className="sm:hidden">Send to Models</span>}
            </Button>
          </div>

          {hasInsufficientCredits && (
            <div className="flex items-start gap-2 text-xs sm:text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 w-full max-w-full">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">
                Insufficient credits. You need {totalCredits} credits but only have {availableCredits}. Please upgrade
                your plan or select fewer models.
              </span>
            </div>
          )}

          {selectedModels.length === 0 && (
            <p className="text-xs sm:text-sm text-muted-foreground text-center break-words">
              Please select at least one model to compare
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
