"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle2, MessageSquare, RefreshCw, Copy } from "lucide-react"
import { AI_MODELS } from "@/lib/ai-config"
import { submitToModels, type ModelResponse } from "@/lib/api-client"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { LoadingSpinner } from "@/components/loading-spinner"
import { ExportDropdown } from "@/components/export-dropdown"
import { useTopics } from "@/lib/contexts/topics-context"
import type { ExportData } from "@/lib/export-utils"

interface ResponseDisplayProps {
  responses: ModelResponse[]
  onNewResponses?: (responses: ModelResponse[]) => void
  isLoading?: boolean
  selectedModels?: string[]
  currentPrompt?: string
  enableSummarization?: boolean
  summarizationModel?: string
  summary?: string // Added prop for server-generated summary
}

interface FollowUpConversation {
  question: string
  response: ModelResponse
  timestamp: string
}

export function ResponseDisplay({
  responses,
  onNewResponses,
  isLoading = false,
  selectedModels = [],
  currentPrompt = "",
  enableSummarization = true,
  summarizationModel = "chatgpt",
  summary: serverSummary, // Renamed to serverSummary to distinguish from local state
}: ResponseDisplayProps) {
  const [summary, setSummary] = useState<string>("")
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({})
  const [followUpLoading, setFollowUpLoading] = useState<Record<string, boolean>>({})
  const [followUpConversations, setFollowUpConversations] = useState<Record<string, FollowUpConversation[]>>({})
  const [retryLoading, setRetryLoading] = useState<Record<string, boolean>>({})
  const [followUpResponses, setFollowUpResponses] = useState<Record<string, ModelResponse[]>>({})
  const [savedResponseIds, setSavedResponseIds] = useState<Set<string>>(new Set())

  const { currentTopicId, addMessageToTopic } = useTopics()

  useEffect(() => {
    if (serverSummary) {
      console.log("[v0] Received server-generated summary (no additional credit deducted)")
      setSummary(serverSummary)
      setIsGeneratingSummary(false)
    }
  }, [serverSummary])

  useEffect(() => {
    if (isLoading && selectedModels.length > 0 && enableSummarization) {
      setIsGeneratingSummary(true)
      setSummary("")
    }
  }, [isLoading, selectedModels, enableSummarization])

  useEffect(() => {
    console.log("[v0] ========== RESPONSE SAVE EFFECT TRIGGERED ==========")
    console.log("[v0] Number of responses:", responses.length)
    console.log("[v0] Current topic ID:", currentTopicId)
    console.log("[v0] Saved response IDs count:", savedResponseIds.size)

    if (responses.length > 0 && currentTopicId) {
      console.log("[v0] Checking responses to save to topic:", currentTopicId)
      responses.forEach(async (response, index) => {
        const responseId = `${currentTopicId}-${response.modelId}-${response.response.substring(0, 50)}`

        console.log(`[v0] Response ${index + 1}/${responses.length}:`, {
          modelId: response.modelId,
          modelName: response.modelName,
          success: response.success,
          responseLength: response.response.length,
          alreadySaved: savedResponseIds.has(responseId),
        })

        if (response.success && response.response && !savedResponseIds.has(responseId)) {
          console.log("[v0] ========== SAVING NEW RESPONSE ==========")
          console.log("[v0] Topic ID:", currentTopicId)
          console.log("[v0] Model:", response.modelName)
          console.log("[v0] Response preview:", response.response.substring(0, 100))
          try {
            console.log("[v0] Calling addMessageToTopic...")
            await addMessageToTopic(currentTopicId, "answer", response.response, response.modelName)
            setSavedResponseIds((prev) => new Set(prev).add(responseId))
            console.log("[v0] Response saved successfully")
          } catch (error) {
            console.error("[v0] ========== FAILED TO SAVE RESPONSE ==========")
            console.error("[v0] Error:", error)
            console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
          }
        } else if (savedResponseIds.has(responseId)) {
          console.log("[v0] Response already saved, skipping:", response.modelName)
        } else if (!response.success) {
          console.log("[v0] Response failed, not saving:", response.modelName)
        } else if (!response.response) {
          console.log("[v0] Response empty, not saving:", response.modelName)
        }
      })
    } else {
      if (responses.length === 0) {
        console.log("[v0] No responses to save")
      }
      if (!currentTopicId) {
        console.log("[v0] No current topic ID, cannot save responses")
      }
    }
    console.log("[v0] ========== RESPONSE SAVE EFFECT COMPLETE ==========")
  }, [responses, currentTopicId])

  useEffect(() => {
    console.log("[v0] Topic changed, clearing saved response IDs")
    setSavedResponseIds(new Set())
  }, [currentTopicId])

  const handleFollowUp = async (modelId: string) => {
    const followUpPrompt = followUpInputs[modelId]
    if (!followUpPrompt?.trim()) return

    setFollowUpLoading((prev) => ({ ...prev, [modelId]: true }))

    try {
      if (currentTopicId) {
        console.log("[v0] Saving follow-up question to topic:", currentTopicId)
        await addMessageToTopic(currentTopicId, "question", followUpPrompt)
      }

      const originalResponse = responses.find((r) => r.modelId === modelId)
      const previousConversations = followUpConversations[modelId] || []

      let contextualPrompt = `Original question: ${currentPrompt}\n\nYour previous response: ${originalResponse?.response || ""}\n\n`

      if (previousConversations.length > 0) {
        contextualPrompt += "Previous follow-up conversation:\n"
        previousConversations.forEach((conv, idx) => {
          contextualPrompt += `\nFollow-up ${idx + 1}: ${conv.question}\nYour response: ${conv.response.response}\n`
        })
        contextualPrompt += "\n"
      }

      contextualPrompt += `New follow-up question: ${followUpPrompt}`

      const response = await submitToModels(contextualPrompt, [modelId])

      if (response.results.length > 0) {
        const followUpResponse = response.results[0]

        if (currentTopicId && followUpResponse.success && followUpResponse.response) {
          console.log("[v0] Saving follow-up answer to topic:", currentTopicId)
          await addMessageToTopic(currentTopicId, "answer", followUpResponse.response, followUpResponse.modelName)
        }

        const conversation: FollowUpConversation = {
          question: followUpPrompt,
          response: followUpResponse,
          timestamp: new Date().toISOString(),
        }

        setFollowUpConversations((prev) => ({
          ...prev,
          [modelId]: [...(prev[modelId] || []), conversation],
        }))

        setFollowUpResponses((prev) => ({
          ...prev,
          [modelId]: [...(prev[modelId] || []), followUpResponse],
        }))
      }

      console.log("[v0] Follow-up response:", response)
    } catch (error) {
      console.error("[v0] Follow-up error:", error)
    } finally {
      setFollowUpLoading((prev) => ({ ...prev, [modelId]: false }))
      setFollowUpInputs((prev) => ({ ...prev, [modelId]: "" }))
    }
  }

  const updateFollowUpInput = (modelId: string, value: string) => {
    setFollowUpInputs((prev) => ({ ...prev, [modelId]: value }))
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      console.log("[v0] Copied to clipboard")
    } catch (error) {
      console.error("[v0] Copy failed:", error)
    }
  }

  const exportResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      prompt: currentPrompt,
      responses: responses.map((r) => ({
        model: r.modelName,
        success: r.success,
        response: r.response,
        error: r.error,
      })),
      summary,
      followUpResponses,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `comparelabs-comparison-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleRetry = async (modelId: string) => {
    if (!currentPrompt?.trim()) return

    setRetryLoading((prev) => ({ ...prev, [modelId]: true }))

    try {
      console.log("[v0] Retrying model:", modelId)
      const response = await submitToModels(currentPrompt, [modelId])

      if (response.results.length > 0) {
        const updatedResponses = responses.map((r) => (r.modelId === modelId ? response.results[0] : r))

        if (!responses.find((r) => r.modelId === modelId)) {
          updatedResponses.push(response.results[0])
        }

        onNewResponses?.(updatedResponses)
        console.log("[v0] Retry successful for:", modelId)
      }
    } catch (error) {
      console.error("[v0] Retry failed for model:", modelId, error)
    } finally {
      setRetryLoading((prev) => ({ ...prev, [modelId]: false }))
    }
  }

  const exportData: ExportData = {
    timestamp: new Date().toISOString(),
    prompt: currentPrompt,
    responses,
    summary,
    followUpResponses,
  }

  if (!isLoading && responses.length === 0 && selectedModels.length === 0) {
    return null
  }

  return (
    <section id="results" className="w-full max-w-full overflow-x-hidden space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-xl sm:text-2xl font-bold break-words">Model Responses</h3>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Badge variant="secondary" className="text-xs sm:text-sm whitespace-nowrap">
            {isLoading
              ? `${selectedModels.length} model${selectedModels.length !== 1 ? "s" : ""} loading...`
              : `${responses.length} model${responses.length !== 1 ? "s" : ""} compared`}
          </Badge>
          <ExportDropdown data={exportData} disabled={responses.length === 0 && !isLoading} />
        </div>
      </div>

      {enableSummarization && (
        <Card className="w-full max-w-full overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-start sm:items-center gap-2 flex-wrap text-sm sm:text-base">
                <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
                <span className="break-words">The Super Answer - Combines the best of each model</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(summary)}
                disabled={!summary || isGeneratingSummary}
                className="flex items-center gap-1 self-start sm:self-auto flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="w-full max-w-full overflow-x-hidden">
            {isGeneratingSummary ? (
              <div className="flex items-center gap-3 py-4 flex-wrap">
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                <span className="text-muted-foreground text-sm break-words">
                  Generating comprehensive AI-powered summary...
                </span>
              </div>
            ) : summary ? (
              <div className="prose prose-sm max-w-none dark:prose-invert break-words overflow-x-hidden">
                <MarkdownRenderer content={summary} />
              </div>
            ) : isLoading ? (
              <div className="flex items-center gap-3 py-4 flex-wrap">
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
                <span className="text-muted-foreground text-sm break-words">
                  Waiting for model responses to generate summary...
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-sm break-words">
                Summary will appear here after model responses are received.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 w-full max-w-full">
        {isLoading &&
          selectedModels
            .filter((modelId) => !responses.find((r) => r.modelId === modelId))
            .map((modelId) => {
              const model = AI_MODELS[modelId]

              return (
                <Card key={modelId} className="flex flex-col h-full">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${model?.gradient || "bg-gray-500"} flex items-center justify-center`}
                        >
                          <span className="text-xl">{model?.icon || "🤖"}</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{model?.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{model?.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" className="text-primary" />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 mb-4">
                      <div className="flex items-center space-x-3 py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="text-muted-foreground">Generating response...</span>
                      </div>
                      <div className="space-y-3">
                        <div className="h-4 bg-muted rounded animate-pulse"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

        {responses.map((response) => {
          const model = AI_MODELS[response.modelId]
          const isFollowUpLoading = followUpLoading[response.modelId]
          const modelConversations = followUpConversations[response.modelId] || []

          return (
            <Card key={response.modelId} className="flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg ${model?.gradient || "bg-gray-500"} flex items-center justify-center`}
                    >
                      <span className="text-xl">{model?.icon || "🤖"}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{response.modelName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{model?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {response.success && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(response.response)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    {response.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 mb-4">
                  {response.success ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <MarkdownRenderer content={response.response} />
                    </div>
                  ) : (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm font-medium text-destructive">Error</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{response.error || "Unknown error occurred"}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(response.modelId)}
                        disabled={retryLoading[response.modelId] || !currentPrompt}
                        className="flex items-center space-x-2"
                      >
                        {retryLoading[response.modelId] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span>{retryLoading[response.modelId] ? "Retrying..." : "Retry"}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {modelConversations.length > 0 && (
                  <div className="mb-4 space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Follow-up conversation:</h4>
                    {modelConversations.map((conversation, index) => (
                      <div key={index} className="space-y-2">
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">You asked:</span>
                          </div>
                          <p className="text-sm">{conversation.question}</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className={`w-4 h-4 rounded ${model?.gradient || "bg-gray-500"}`}></div>
                            <span className="text-sm font-medium">{response.modelName} replied:</span>
                          </div>
                          <div className="text-sm">
                            <MarkdownRenderer content={conversation.response.response} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {response.success && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-4 w-4" />
                      <span>Follow-up question</span>
                    </div>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Ask a follow-up..."
                        value={followUpInputs[response.modelId] || ""}
                        onChange={(e) => updateFollowUpInput(response.modelId, e.target.value)}
                        disabled={isFollowUpLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleFollowUp(response.modelId)
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleFollowUp(response.modelId)}
                        disabled={!followUpInputs[response.modelId]?.trim() || isFollowUpLoading}
                        className="px-3"
                      >
                        {isFollowUpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
