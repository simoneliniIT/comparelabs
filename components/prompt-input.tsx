"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { submitToModels, submitToModelsStreaming, type ModelResponse } from "@/lib/api-client"
import { AI_MODELS } from "@/lib/ai-config"
import { createClient } from "@/lib/supabase/client"
import { Coins, AlertCircle, Sparkles } from "lucide-react"

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
      <div className="bg-gradient-to-br from-card to-card/95 border-2 border-border/50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 lg:p-12 shadow-xl hover:shadow-2xl transition-shadow duration-300 w-full max-w-full">
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-8">
          <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
            Ask Your Question
          </h2>
        </div>

        <div className="space-y-5 sm:space-y-6 w-full max-w-full">
          <div className="relative">
            <Textarea
              placeholder="Enter your prompt here... (e.g., 'Explain quantum computing in simple terms')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-32 sm:min-h-40 text-base sm:text-lg resize-none bg-background/50 backdrop-blur-sm border-2 border-border focus:border-primary focus:ring-4 focus:ring-primary/20 rounded-xl transition-all duration-200 w-full shadow-inner"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && autoSubmit) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-4 w-full max-w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-bold text-foreground text-lg">{totalCredits}</span>
                  <span className="text-muted-foreground">credits</span>
                </div>

                {remainingCredits !== null && (
                  <div
                    className={`flex items-center gap-2 text-sm sm:text-base ${
                      hasInsufficientCredits ? "text-destructive font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {hasInsufficientCredits && <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                    <span>→</span>
                    <span className="font-bold text-lg">{Math.max(0, remainingCredits)}</span>
                    <span>remaining</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-submit"
                  checked={autoSubmit}
                  onCheckedChange={(checked) => setAutoSubmit(checked as boolean)}
                  disabled={isLoading}
                />
                <label htmlFor="auto-submit" className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer">
                  Auto-submit on Enter
                </label>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!prompt.trim() || selectedModels.length === 0 || isLoading || hasInsufficientCredits}
              size="lg"
              className="gradient-bg hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 px-8 py-6 w-full text-base sm:text-lg font-semibold shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Sending to Models...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Send to All Models
                </span>
              )}
            </Button>
          </div>

          {hasInsufficientCredits && (
            <div className="flex items-start gap-3 text-sm text-destructive bg-destructive/10 border-2 border-destructive/30 rounded-xl p-4 w-full max-w-full">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span className="break-words">
                Insufficient credits. You need {totalCredits} credits but only have {availableCredits}. Please upgrade
                your plan or select fewer models.
              </span>
            </div>
          )}

          {selectedModels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center break-words bg-muted/20 rounded-lg p-3 border border-border/30">
              Please select at least one model to compare
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
