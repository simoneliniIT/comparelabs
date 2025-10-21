"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, User, Copy, Clock } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { AI_MODELS } from "@/lib/ai-config"
import type { TopicMessage } from "@/lib/contexts/topics-context"
import { LoadingSpinner } from "@/components/loading-spinner"

interface ConversationHistoryProps {
  messages: TopicMessage[]
  isLoading: boolean
  topicTitle?: string
}

export function ConversationHistory({ messages, isLoading, topicTitle }: ConversationHistoryProps) {
  console.log("[v0] ConversationHistory - messages:", messages)
  console.log("[v0] ConversationHistory - isLoading:", isLoading)
  console.log("[v0] ConversationHistory - topicTitle:", topicTitle)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      console.log("[v0] Copied to clipboard")
    } catch (error) {
      console.error("[v0] Copy failed:", error)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (isLoading) {
    console.log("[v0] ConversationHistory - Rendering loading state")
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span>Loading Conversation History...</span>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3 py-8">
              <LoadingSpinner size="sm" className="text-primary" />
              <span className="text-muted-foreground">Loading messages...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (messages.length === 0) {
    console.log("[v0] ConversationHistory - Rendering no messages state")
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <span>No Messages Found</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground py-4">This conversation doesn't have any saved messages yet.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log("[v0] ConversationHistory - Rendering messages, count:", messages.length)

  // Group messages by question-answer pairs
  const messageGroups: Array<{
    question: TopicMessage
    answers: TopicMessage[]
  }> = []

  let currentQuestion: TopicMessage | null = null
  let currentAnswers: TopicMessage[] = []

  for (const message of messages) {
    if (message.type === "question") {
      // Save previous group if exists
      if (currentQuestion) {
        messageGroups.push({
          question: currentQuestion,
          answers: currentAnswers,
        })
      }
      // Start new group
      currentQuestion = message
      currentAnswers = []
    } else if (message.type === "answer" && currentQuestion) {
      currentAnswers.push(message)
    }
  }

  // Add the last group
  if (currentQuestion) {
    messageGroups.push({
      question: currentQuestion,
      answers: currentAnswers,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span>Conversation History</span>
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {messages.length} message{messages.length !== 1 ? "s" : ""}
            </Badge>
          </div>
          {topicTitle && <p className="text-sm text-muted-foreground mt-2">{topicTitle}</p>}
        </CardHeader>
      </Card>

      {messageGroups.map((group, groupIndex) => (
        <div key={groupIndex} className="space-y-4">
          {/* Question */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-primary">You asked:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-muted-foreground">{formatTime(group.question.created_at)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(group.question.content)}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p>{group.question.content}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Answers */}
          {group.answers.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 ml-4">
              {group.answers.map((answer) => {
                const model = AI_MODELS[answer.model_name || ""] || {
                  name: answer.model_name || "Unknown Model",
                  icon: "🤖",
                  gradient: "bg-gray-500",
                  description: "AI Model",
                }

                return (
                  <Card key={answer.id} className="border-l-4 border-l-muted">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded ${model.gradient} flex items-center justify-center`}>
                            <span className="text-sm">{model.icon}</span>
                          </div>
                          <span className="text-sm font-medium">{model.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">{formatTime(answer.created_at)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(answer.content)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <MarkdownRenderer content={answer.content} />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
