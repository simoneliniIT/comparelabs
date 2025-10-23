"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, CheckCircle2, MessageSquare, RefreshCw, Copy, Sparkles } from "lucide-react"
import { AI_MODELS } from "@/lib/ai-config"
import { submitToModels, submitToModelsStreaming, type ModelResponse } from "@/lib/api-client"
import { MarkdownRenderer } from "@/components/markdown-renderer"
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
  topicIdRef?: React.MutableRefObject<string | null> // Added ref prop for immediate topic ID access
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
  topicIdRef, // Receive topic ID ref
}: ResponseDisplayProps) {
  const [summary, setSummary] = useState<string>("")
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [followUpInputs, setFollowUpInputs] = useState<Record<string, string>>({})
  const [followUpLoading, setFollowUpLoading] = useState<Record<string, boolean>>({})
  const [followUpConversations, setFollowUpConversations] = useState<Record<string, FollowUpConversation[]>>({})
  const [retryLoading, setRetryLoading] = useState<Record<string, boolean>>({})
  const [followUpResponses, setFollowUpResponses] = useState<Record<string, ModelResponse[]>>({})

  const savedResponseIdsRef = useRef<Set<string>>(new Set())
  const lastSaveCheckRef = useRef<number>(0)

  const { currentTopicId, addMessageToTopic } = useTopics()

  useEffect(() => {
    if (serverSummary) {
      console.log("[v0] ========== SERVER SUMMARY RECEIVED ==========")
      console.log("[v0] Summary length:", serverSummary.length)
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
    const now = Date.now()

    // Throttle to once per second
    if (now - lastSaveCheckRef.current < 1000) {
      return
    }

    const topicId = topicIdRef?.current || currentTopicId

    if (responses.length === 0 || !topicId) {
      return
    }

    lastSaveCheckRef.current = now

    const responsesToSave = responses.filter((response) => {
      const responseId = `${topicId}-${response.modelId}`
      const isComplete = response.success && response.response && !(response as any).isStreaming
      const notYetSaved = !savedResponseIdsRef.current.has(responseId)
      return isComplete && notYetSaved
    })

    if (responsesToSave.length === 0) {
      return
    }

    console.log("[v0] ========== SAVING RESPONSES ==========")
    console.log("[v0] Topic ID (from ref):", topicIdRef?.current)
    console.log("[v0] Topic ID (from context):", currentTopicId)
    console.log("[v0] Using topic ID:", topicId)
    console.log("[v0] New complete responses to save:", responsesToSave.length)
    console.log("[v0] Models being saved:", responsesToSave.map((r) => r.modelName).join(", "))

    // Save all new responses
    responsesToSave.forEach(async (response) => {
      const responseId = `${topicId}-${response.modelId}`
      try {
        console.log("[v0] Saving complete response from:", response.modelName, `(${response.response.length} chars)`)
        await addMessageToTopic(topicId, "answer", response.response, response.modelName)
        savedResponseIdsRef.current.add(responseId)
        console.log("[v0] Response saved successfully")
      } catch (error) {
        console.error("[v0] Failed to save response from", response.modelName, ":", error)
      }
    })

    console.log("[v0] ========== SAVE COMPLETE ==========")
  }, [responses, currentTopicId, topicIdRef, addMessageToTopic])

  useEffect(() => {
    console.log("[v0] Topic changed, clearing saved response tracking")
    savedResponseIdsRef.current.clear()
    lastSaveCheckRef.current = 0
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

      let followUpResponse: ModelResponse | null = null
      let accumulatedResponse = ""

      await submitToModelsStreaming(contextualPrompt, [modelId], {
        enableSummarization: false,
        onChunk: (chunkModelId, modelName, chunk) => {
          accumulatedResponse += chunk
        },
        onComplete: (chunkModelId, modelName, response) => {
          followUpResponse = {
            modelId: chunkModelId,
            modelName,
            response,
            success: true,
          }
        },
        onError: (chunkModelId, modelName, error) => {
          followUpResponse = {
            modelId: chunkModelId,
            modelName,
            response: "",
            success: false,
            error,
          }
        },
      })

      if (followUpResponse && followUpResponse.success) {
        if (currentTopicId && followUpResponse.response) {
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

        console.log("[v0] Follow-up response received successfully")
      } else if (followUpResponse) {
        console.error("[v0] Follow-up error:", followUpResponse.error)
        throw new Error(followUpResponse.error || "Follow-up request failed")
      }
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
        <div className="relative w-full max-w-full overflow-hidden">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-sm opacity-20"></div>

          <Card className="relative w-full max-w-full overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5 shadow-xl">
            <CardHeader className="pb-6 pt-8 px-6 sm:px-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="h-7 w-7 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs px-2 py-0.5 shadow-md">
                        PRO
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1">
                    <CardTitle className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      The Super Answer
                    </CardTitle>
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      AI-powered synthesis combining the best insights from all models
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="default"
                  onClick={() => copyToClipboard(summary)}
                  disabled={!summary || isGeneratingSummary}
                  className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0 border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy Answer</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="w-full max-w-full overflow-x-hidden px-6 sm:px-8 pb-8">
              {isGeneratingSummary ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-primary/20"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-base font-medium">Generating Super Answer...</p>
                    <p className="text-sm text-muted-foreground">
                      Analyzing and synthesizing responses from all models
                    </p>
                  </div>
                </div>
              ) : summary ? (
                <div className="prose prose-base max-w-none dark:prose-invert break-words overflow-x-hidden prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground/90 prose-p:leading-relaxed prose-strong:text-foreground prose-strong:font-semibold">
                  <MarkdownRenderer content={summary} />
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="relative">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-primary/20"></div>
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-base font-medium">Waiting for all models to finish...</p>
                    <p className="text-sm text-muted-foreground">
                      The Super Answer will start generating once all model responses are complete
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-base font-medium text-muted-foreground">
                    Submit a prompt to generate your Super Answer
                  </p>
                  <p className="text-sm text-muted-foreground/80">
                    Get the best insights from multiple AI models in one comprehensive response
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
                        <Badge variant="secondary" className="text-xs">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Streaming
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex-1 mb-4">
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
          const isCurrentlyStreaming = (response as any).isStreaming === true

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
                    {isCurrentlyStreaming ? (
                      <Badge variant="secondary" className="text-xs">
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Streaming
                      </Badge>
                    ) : response.success ? (
                      <>
                        <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(response.response)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
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
