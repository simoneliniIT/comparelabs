"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { HistorySidebar } from "@/components/history-sidebar"
import { PromptInput } from "@/components/prompt-input"
import { ModelSelection } from "@/components/model-selection"
import { ResponseDisplay } from "@/components/response-display"
import { UpgradePrompt } from "@/components/upgrade-prompt"
import { ConversationHistory } from "@/components/conversation-history"
import { useTopics, TopicsProvider } from "@/lib/contexts/topics-context"
import { getDefaultModels } from "@/lib/ai-config" // Import getDefaultModels helper
import type { ModelResponse } from "@/lib/api-client"

function ComparePageContent() {
  const [selectedModels, setSelectedModels] = useState<string[]>(getDefaultModels())
  const [enableSummarization, setEnableSummarization] = useState(true)
  const [summarizationModel, setSummarizationModel] = useState("gemini-2.5-pro") // Set Gemini 2.5 Pro as the default summarization model
  const [responses, setResponses] = useState<ModelResponse[]>([])
  const [streamingResponses, setStreamingResponses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState("")
  const [summary, setSummary] = useState<string>("") // Added state for server-generated summary
  const [showUpgradePrompt, setShowUpgradePrompt] = useState<{
    show: boolean
    trigger?: "usage_limit" | "model_access"
    message?: string
  }>({ show: false })

  const currentTopicIdRef = useRef<string | null>(null)

  const {
    currentTopicId,
    currentTopicMessages,
    isLoadingMessages,
    createTopic,
    addMessageToTopic,
    topics,
    selectTopic,
    isLoading: isTopicsLoading,
    isAuthEnabled,
    startNewTopic: contextStartNewTopic,
    setIsStreaming,
  } = useTopics()

  useEffect(() => {
    currentTopicIdRef.current = currentTopicId
    console.log("[v0] Topic ID synced to ref:", currentTopicId)
  }, [currentTopicId])

  const searchParams = useSearchParams()
  const topicFromUrl = searchParams.get("topic")

  const hasProcessedNewTopic = useRef(false)

  const getResponsesFromTopicMessages = (): ModelResponse[] => {
    if (!currentTopicMessages.length) return []

    // Find the last question to get the most recent set of responses
    const questions = currentTopicMessages.filter((msg) => msg.type === "question")
    if (!questions.length) return []

    const lastQuestion = questions[questions.length - 1]
    const lastQuestionIndex = currentTopicMessages.findIndex((msg) => msg.id === lastQuestion.id)

    // Get all answer messages after the last question
    const answersAfterLastQuestion = currentTopicMessages
      .slice(lastQuestionIndex + 1)
      .filter((msg) => msg.type === "answer" && msg.model_name)

    const responsesByModel = new Map<string, (typeof answersAfterLastQuestion)[0]>()
    answersAfterLastQuestion.forEach((msg) => {
      if (msg.model_name) {
        // Always overwrite with the latest message from this model
        responsesByModel.set(msg.model_name, msg)
      }
    })

    console.log("[v0] Loaded responses from topic messages:")
    console.log("[v0] - Total answer messages:", answersAfterLastQuestion.length)
    console.log("[v0] - Unique models after deduplication:", responsesByModel.size)
    console.log("[v0] - Models:", Array.from(responsesByModel.keys()))

    // Convert to ModelResponse format using deduplicated responses
    return Array.from(responsesByModel.values()).map((msg) => ({
      modelId: msg.model_name!.toLowerCase().replace(/\s+/g, "-"),
      modelName: msg.model_name!,
      response: msg.content,
      success: true,
      error: null,
    }))
  }

  const getPromptFromTopicMessages = (): string => {
    if (!currentTopicMessages.length) return ""

    // Find the last question to get the most recent prompt
    const questions = currentTopicMessages.filter((msg) => msg.type === "question")
    if (!questions.length) return ""

    const lastQuestion = questions[questions.length - 1]
    return lastQuestion.content || ""
  }

  const getConversationHistoryMessages = () => {
    if (!currentTopicMessages.length) return []

    // Find all questions
    const questions = currentTopicMessages.filter((msg) => msg.type === "question")
    if (questions.length <= 1) {
      // If there's only one question, don't show conversation history
      // The responses will be shown in ResponseDisplay with follow-up inputs
      return []
    }

    // If there are multiple questions, show everything except the last question and its answers
    const lastQuestion = questions[questions.length - 1]
    const lastQuestionIndex = currentTopicMessages.findIndex((msg) => msg.id === lastQuestion.id)

    return currentTopicMessages.slice(0, lastQuestionIndex)
  }

  const topicResponses = getResponsesFromTopicMessages()
  const topicPrompt = getPromptFromTopicMessages()
  const conversationHistoryMessages = getConversationHistoryMessages()
  const hasTopicWithMessages = currentTopicId && currentTopicMessages.length > 0
  const shouldShowMainPromptInput = !hasTopicWithMessages

  const responsesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasTopicWithMessages && topicPrompt && topicPrompt !== currentPrompt) {
      console.log("[v0] Setting prompt from topic messages:", topicPrompt)
      setCurrentPrompt(topicPrompt)
    }
  }, [hasTopicWithMessages, topicPrompt])

  useEffect(() => {
    // Wait for topics context to finish loading before attempting to load topic from URL
    if (isTopicsLoading) {
      console.log("[v0] Topics context still loading, waiting...")
      return
    }

    if (topicFromUrl && topicFromUrl !== currentTopicId) {
      console.log("[v0] Loading topic from URL:", topicFromUrl)
      console.log("[v0] Topics context ready - isAuthEnabled:", isAuthEnabled)
      selectTopic(topicFromUrl)
    }
  }, [topicFromUrl, currentTopicId, selectTopic, isTopicsLoading, isAuthEnabled])

  useEffect(() => {
    if (currentTopicId === null && !topicFromUrl) {
      console.log("[v0] New topic started, clearing conversation")
      setResponses([])
      setCurrentPrompt("")
      setShowUpgradePrompt({ show: false })
      setStreamingResponses({})
      setSummary("")
    }
  }, [currentTopicId, topicFromUrl])

  const handleResponsesReceived = async (newResponses: ModelResponse[], prompt: string) => {
    console.log("[v0] ========== RESPONSES RECEIVED ==========")
    console.log("[v0] Number of responses:", newResponses.length)
    console.log("[v0] Prompt:", prompt)
    console.log("[v0] Current topic ID:", currentTopicId)
    console.log("[v0] Is auth enabled:", isAuthEnabled)

    console.log("[v0] Setting responses state...")
    setResponses(newResponses)
    console.log("[v0] Responses set, stopping loading...")
    setTimeout(() => setIsLoading(false), 0)
    console.log("[v0] ========== RESPONSES RECEIVED COMPLETE ==========")
  }

  const handleSubmissionStart = async (prompt: string) => {
    console.log("[v0] ========== SUBMISSION STARTED ==========")
    console.log("[v0] Prompt:", prompt)
    console.log("[v0] Current topic ID BEFORE:", currentTopicId)

    setIsStreaming(true)

    setCurrentPrompt(prompt)
    setIsLoading(true)
    setResponses([]) // Clear previous responses
    setStreamingResponses({}) // Clear streaming responses when starting new query
    setSummary("") // Clear previous summary when starting new query
    setShowUpgradePrompt({ show: false }) // Hide upgrade prompt when starting new query

    if (!currentTopicId) {
      console.log("[v0] ========== CREATING TOPIC BEFORE STREAMING ==========")
      try {
        const topicId = await createTopic(prompt)
        console.log("[v0] Topic created with ID:", topicId)

        currentTopicIdRef.current = topicId
        console.log("[v0] Topic ID stored in ref:", currentTopicIdRef.current)

        // Wait for state to propagate
        await new Promise((resolve) => setTimeout(resolve, 150))
        console.log("[v0] Topic creation complete, ref ID:", currentTopicIdRef.current)
      } catch (error) {
        console.error("[v0] Topic creation failed:", error)
      }
    } else {
      console.log("[v0] Adding follow-up question to existing topic:", currentTopicId)
      try {
        await addMessageToTopic(currentTopicId, "question", prompt)
        console.log("[v0] Follow-up question added")
      } catch (error) {
        console.error("[v0] Failed to add question:", error)
      }
    }

    setTimeout(() => {
      responsesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)

    console.log("[v0] ========== SUBMISSION START COMPLETE ==========")
  }

  const handleNewResponses = (newResponses: ModelResponse[]) => {
    setResponses((prev) => [...prev, ...newResponses])
  }

  const handleStreamChunk = (modelId: string, modelName: string, chunk: string) => {
    console.log(`[v0] Stream chunk from ${modelName}:`, chunk.substring(0, 50))
    setStreamingResponses((prev) => ({
      ...prev,
      [modelId]: (prev[modelId] || "") + chunk,
    }))
  }

  const handleStreamComplete = async (modelId: string, modelName: string, response: string, tokenUsage?: any) => {
    console.log(`[v0] Stream complete from ${modelName}`)

    const completeResponse: ModelResponse = {
      modelId,
      modelName,
      response,
      success: true,
    }

    setResponses((prev) => {
      const existing = prev.find((r) => r.modelId === modelId)
      if (existing) {
        return prev.map((r) => (r.modelId === modelId ? completeResponse : r))
      }
      return [...prev, completeResponse]
    })

    setStreamingResponses((prev) => {
      const newState = { ...prev }
      delete newState[modelId]

      if (Object.keys(newState).length === 0) {
        console.log("[v0] All streams complete, setting streaming state to false")
        setIsStreaming(false)
        // Don't set isLoading to false here - let the summary generation complete first
      }

      return newState
    })
  }

  const handleStreamError = (modelId: string, modelName: string, error: string) => {
    console.error(`[v0] Stream error from ${modelName}:`, error)

    const errorResponse: ModelResponse = {
      modelId,
      modelName,
      response: `Error: ${error}`,
      success: false,
      error,
    }

    setResponses((prev) => {
      const existing = prev.find((r) => r.modelId === modelId)
      if (existing) {
        return prev.map((r) => (r.modelId === modelId ? errorResponse : r))
      }
      return [...prev, errorResponse]
    })

    // Clear streaming state for this model
    setStreamingResponses((prev) => {
      const newState = { ...prev }
      delete newState[modelId]

      if (Object.keys(newState).length === 0) {
        console.log("[v0] All streams complete (with errors), setting streaming state to false")
        setIsStreaming(false)
      }

      return newState
    })
  }

  const handleError = (error: string) => {
    console.log("[v0] Handling error:", error)
    setIsLoading(false)

    if (error.includes("Daily limit exceeded") || error.includes("Usage limit exceeded")) {
      setShowUpgradePrompt({
        show: true,
        trigger: "usage_limit",
        message: error,
      })
    } else if (error.includes("plan doesn't include access")) {
      setShowUpgradePrompt({
        show: true,
        trigger: "model_access",
        message: error,
      })
    } else {
      setShowUpgradePrompt({
        show: true,
        trigger: "usage_limit",
        message: error,
      })
    }
  }

  const handleSummary = (summaryText: string) => {
    console.log("[v0] ========== SUMMARY RECEIVED IN COMPARE PAGE ==========")
    console.log("[v0] Summary length:", summaryText.length)
    console.log("[v0] Summary preview:", summaryText.substring(0, 100))
    console.log("[v0] Current summary state before update:", summary.substring(0, 50))
    setSummary(summaryText)
    if (summaryText.length > 0) {
      setIsLoading(false)
    }
    console.log("[v0] Summary state updated")
    console.log("[v0] ========== SUMMARY HANDLING COMPLETE ==========")
  }

  const displayResponses = responses.map((response) => {
    if (streamingResponses[response.modelId]) {
      return {
        ...response,
        response: streamingResponses[response.modelId],
        isStreaming: true,
      }
    }
    return response
  })

  Object.entries(streamingResponses).forEach(([modelId, text]) => {
    if (!responses.find((r) => r.modelId === modelId)) {
      displayResponses.push({
        modelId,
        modelName: modelId,
        response: text,
        success: true,
        isStreaming: true,
      } as ModelResponse & { isStreaming: boolean })
    }
  })

  const shouldShowInputAndSelection =
    shouldShowMainPromptInput && !isLoading && responses.length === 0 && Object.keys(streamingResponses).length === 0

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <div className="flex overflow-x-hidden">
        <HistorySidebar />

        <div className="flex-1 flex flex-col max-w-full overflow-x-hidden">
          <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8">
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">Compare AI Models</h1>
              <p className="text-sm sm:text-base text-muted-foreground break-words">
                Get responses from multiple AI models and compare their outputs side by side.
              </p>
            </div>

            {showUpgradePrompt.show && (
              <div className="mb-6">
                <UpgradePrompt trigger={showUpgradePrompt.trigger} message={showUpgradePrompt.message} />
              </div>
            )}

            {currentTopicId && !isLoading && responses.length === 0 && conversationHistoryMessages.length > 0 && (
              <div className="mb-8">
                <ConversationHistory
                  messages={conversationHistoryMessages}
                  isLoading={isLoadingMessages}
                  topicTitle={topics.find((t) => t.id === currentTopicId)?.title}
                />
              </div>
            )}

            {shouldShowInputAndSelection && (
              <PromptInput
                selectedModels={selectedModels}
                enableSummarization={enableSummarization}
                summarizationModel={summarizationModel}
                onResponsesReceived={handleResponsesReceived}
                onSubmissionStart={handleSubmissionStart}
                onError={handleError}
                onStreamChunk={handleStreamChunk}
                onStreamComplete={handleStreamComplete}
                onStreamError={handleStreamError}
                onSummary={handleSummary}
                useStreaming={true}
              />
            )}

            {shouldShowInputAndSelection && (
              <ModelSelection
                selectedModels={selectedModels}
                onSelectionChange={setSelectedModels}
                enableSummarization={enableSummarization}
                onSummarizationChange={setEnableSummarization}
                summarizationModel={summarizationModel}
                onSummarizationModelChange={setSummarizationModel}
              />
            )}

            <div ref={responsesRef}>
              <ResponseDisplay
                responses={hasTopicWithMessages ? topicResponses : displayResponses}
                onNewResponses={handleNewResponses}
                isLoading={isLoading}
                selectedModels={selectedModels}
                currentPrompt={hasTopicWithMessages ? topicPrompt : currentPrompt}
                enableSummarization={enableSummarization}
                summarizationModel={summarizationModel}
                summary={summary}
                topicIdRef={currentTopicIdRef}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default function ComparePage() {
  return (
    <TopicsProvider>
      <ComparePageContent />
    </TopicsProvider>
  )
}
