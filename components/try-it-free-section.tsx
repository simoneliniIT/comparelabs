"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Lock, Sparkles, ArrowRight, CheckCircle2, AlertCircle, Zap } from "lucide-react"
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
    <section id="try-it-free" className="relative py-20 sm:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(14,165,233,0.08),transparent_50%)]"></div>

      <div className="container relative mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 slide-up">
            <Badge className="mb-6 px-4 py-2 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors">
              <Zap className="h-3.5 w-3.5 mr-1.5 inline" />
              No Sign Up Required
            </Badge>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
              Try It Free <span className="gradient-text">Right Now</span>
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
              Compare responses from 4 lightning-fast AI models instantly. Experience the power of AI comparison with
              zero commitment.
            </p>
          </div>

          <div className="mb-12">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <Card className="border-2 border-primary/20 shadow-xl glow-primary bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input
                      placeholder="Ask anything... (e.g., 'Explain quantum computing in simple terms')"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isLoading || hasUsedFreeTry}
                      className="flex-1 h-14 text-base sm:text-lg border-2 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all"
                    />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={!prompt.trim() || isLoading || hasUsedFreeTry}
                      className="h-14 px-8 sm:px-10 text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Comparing...
                        </>
                      ) : hasUsedFreeTry ? (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Used Free Try
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Compare Now
                        </>
                      )}
                    </Button>
                  </div>
                  {hasUsedFreeTry && !error && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                        Sign up for free
                      </Link>{" "}
                      to ask unlimited questions and access premium models
                    </p>
                  )}
                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </form>
          </div>

          {showSignUpPrompt && (
            <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-background shadow-2xl glow-primary mb-12 slide-up">
              <CardContent className="p-8 sm:p-10">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-balance">Want to Ask More Questions?</h3>
                    <p className="text-base sm:text-lg text-muted-foreground mb-6 leading-relaxed text-pretty">
                      Sign up for free to unlock unlimited comparisons, access premium models like GPT-5 and Claude
                      Sonnet 4.5, get AI-powered summaries, and ask follow-up questions.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link href="/auth/signup" className="flex-1 sm:flex-initial">
                        <Button
                          size="lg"
                          className="w-full sm:w-auto h-12 px-8 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          Sign Up Free
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link href="/pricing" className="flex-1 sm:flex-initial">
                        <Button
                          size="lg"
                          variant="outline"
                          className="w-full sm:w-auto h-12 px-8 text-base font-semibold border-2 hover:bg-accent/10 hover:border-accent transition-all bg-transparent"
                        >
                          View Pricing
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(isLoading || displayResponses.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12">
              {isLoading &&
                quickModels
                  .filter((model) => !responses.find((r) => r.modelId === model.id))
                  .map((model) => (
                    <Card
                      key={model.id}
                      className="flex flex-col h-full border-2 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`w-12 h-12 rounded-xl ${model.gradient} flex items-center justify-center shadow-md`}
                            >
                              <span className="text-2xl">{model.icon}</span>
                            </div>
                            <div>
                              <CardTitle className="text-lg sm:text-xl">{model.name}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-0.5">{model.description}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs font-medium">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Streaming
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-3">
                          <div className="h-4 bg-muted rounded-md animate-pulse"></div>
                          <div className="h-4 bg-muted rounded-md animate-pulse w-5/6"></div>
                          <div className="h-4 bg-muted rounded-md animate-pulse w-4/6"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

              {displayResponses.map((response) => {
                const model = AI_MODELS[response.modelId]
                const isCurrentlyStreaming = (response as any).isStreaming === true

                return (
                  <Card
                    key={response.modelId}
                    className="flex flex-col h-full border-2 shadow-lg hover:shadow-xl transition-all duration-300 slide-up"
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div
                            className={`w-12 h-12 rounded-xl ${model?.gradient} flex items-center justify-center shadow-md`}
                          >
                            <span className="text-2xl">{model?.icon}</span>
                          </div>
                          <div>
                            <CardTitle className="text-lg sm:text-xl">{response.modelName}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-0.5">{model?.description}</p>
                          </div>
                        </div>
                        {isCurrentlyStreaming ? (
                          <Badge variant="secondary" className="text-xs font-medium">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Streaming
                          </Badge>
                        ) : (
                          response.success && (
                            <Badge className="text-xs font-medium bg-green-500 hover:bg-green-600">
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
                        <div className="mt-6 pt-6 border-t">
                          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border/50">
                            <div className="flex items-center gap-3">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">
                                Follow-up questions locked
                              </span>
                            </div>
                            <Link href="/auth/signup">
                              <Button size="sm" variant="outline" className="text-xs font-medium bg-transparent">
                                Unlock Free
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
            <div className="slide-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl sm:text-3xl font-bold">Premium Models</h3>
                <Badge className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30">
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Sign Up to Access
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {performanceModels.map((model) => (
                  <Card key={model.id} className="relative overflow-hidden border-2 shadow-lg group">
                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm z-10 flex items-center justify-center group-hover:bg-background/80 transition-all duration-300">
                      <div className="text-center">
                        <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs font-medium text-muted-foreground">Sign up to unlock</p>
                      </div>
                    </div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg ${model.gradient} flex items-center justify-center`}>
                          <span className="text-xl">{model.icon}</span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{model.name}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-4/5"></div>
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
