"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react"
import { AI_MODELS, getModelsByBucket } from "@/lib/ai-config"
import { submitToModelsStreaming, type ModelResponse } from "@/lib/api-client"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function TryItFreeSection() {
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [responses, setResponses] = useState<ModelResponse[]>([])
  const [streamingResponses, setStreamingResponses] = useState<Record<string, string>>({})
  const [hasUsedFreeTry, setHasUsedFreeTry] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quickModels = getModelsByBucket("quick")
  const performanceModels = getModelsByBucket("performance")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isLoading || hasUsedFreeTry) return

    setIsLoading(true)
    setResponses([])
    setStreamingResponses({})
    setError(null)

    const modelIds = quickModels.map((m) => m.id)

    try {
      await submitToModelsStreaming(prompt, modelIds, {
        enableSummarization: false,
        onChunk: (modelId, modelName, chunk) => {
          setStreamingResponses((prev) => ({
            ...prev,
            [modelId]: (prev[modelId] || "") + chunk,
          }))
        },
        onComplete: (modelId, modelName, response) => {
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
            return newState
          })
        },
        onError: (modelId, modelName, error) => {
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

          setStreamingResponses((prev) => {
            const newState = { ...prev }
            delete newState[modelId]
            return newState
          })
        },
      })

      setHasUsedFreeTry(true)
    } catch (error: any) {
      console.error("[v0] Free try error:", error.message)
      setError(error.message || "An error occurred. Please try again.")
      if (error.message.includes("free tries") || error.message.includes("rate limit")) {
        setHasUsedFreeTry(true)
      }
    } finally {
      setIsLoading(false)
    }
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

  const showSignUpPrompt = hasUsedFreeTry && !isLoading && responses.length > 0

  return (
    <section id="try-it-free" className="py-16 sm:py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">No Sign Up Required</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Try It Free Right Now</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Compare responses from 4 fast AI models instantly. No account needed.
            </p>
          </div>

          {/* Prompt Input */}
          <div className="mb-8">
            <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <Input
                  placeholder="Ask anything... (e.g., 'Explain quantum computing in simple terms')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading || hasUsedFreeTry}
                  className="flex-1 h-12 text-base"
                />
                <Button
                  type="submit"
                  size="lg"
                  disabled={!prompt.trim() || isLoading || hasUsedFreeTry}
                  className="gradient-bg hover:opacity-90 px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Comparing...
                    </>
                  ) : hasUsedFreeTry ? (
                    "Used Free Try"
                  ) : (
                    "Compare"
                  )}
                </Button>
              </div>
              {hasUsedFreeTry && !error && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Sign up for free to ask unlimited questions and access premium models
                </p>
              )}
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </div>

          {showSignUpPrompt && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background mb-8">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">Want to Ask More Questions?</h3>
                    <p className="text-muted-foreground mb-4">
                      Sign up for free to get unlimited comparisons, access to premium models like GPT-5 and Claude
                      Sonnet 4.5, AI-powered summaries, and follow-up questions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Link href="/auth/signup">
                        <Button size="default" className="gradient-bg hover:opacity-90 w-full sm:w-auto">
                          Sign Up Free
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href="/pricing">
                        <Button size="default" variant="outline" className="w-full sm:w-auto bg-transparent">
                          View Pricing
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Responses Grid */}
          {(isLoading || displayResponses.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {isLoading &&
                quickModels
                  .filter((model) => !responses.find((r) => r.modelId === model.id))
                  .map((model) => (
                    <Card key={model.id} className="flex flex-col h-full">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg ${model.gradient} flex items-center justify-center`}>
                              <span className="text-xl">{model.icon}</span>
                            </div>
                            <div>
                              <CardTitle className="text-lg">{model.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{model.description}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Streaming
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-3">
                          <div className="h-4 bg-muted rounded animate-pulse"></div>
                          <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                          <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

              {displayResponses.map((response) => {
                const model = AI_MODELS[response.modelId]
                const isCurrentlyStreaming = (response as any).isStreaming === true

                return (
                  <Card key={response.modelId} className="flex flex-col h-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg ${model?.gradient} flex items-center justify-center`}>
                            <span className="text-xl">{model?.icon}</span>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{response.modelName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{model?.description}</p>
                          </div>
                        </div>
                        {isCurrentlyStreaming ? (
                          <Badge variant="secondary" className="text-xs">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Streaming
                          </Badge>
                        ) : (
                          response.success && (
                            <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          )
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {response.success ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <MarkdownRenderer content={response.response} />
                        </div>
                      ) : (
                        <div className="text-sm text-destructive">{response.error || "Error occurred"}</div>
                      )}

                      {response.success && hasUsedFreeTry && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Follow-up questions</span>
                            </div>
                            <Link href="/auth/signup">
                              <Button size="sm" variant="outline" className="text-xs bg-transparent">
                                Sign Up Free
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {(isLoading || displayResponses.length > 0) && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Premium Models</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <Lock className="h-3 w-3 mr-1" />
                  Sign Up to Access
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {performanceModels.map((model) => (
                  <Card key={model.id} className="relative overflow-hidden opacity-60">
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex items-center justify-center">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg ${model.gradient} flex items-center justify-center`}>
                          <span className="text-xl">{model.icon}</span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{model.name}</CardTitle>
                          <p className="text-xs text-muted-foreground">{model.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
