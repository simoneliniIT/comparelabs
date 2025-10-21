"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTopics } from "@/lib/contexts/topics-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Plus, Trash2, Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface HistorySidebarProps {
  className?: string
}

export function HistorySidebar({ className }: HistorySidebarProps) {
  const isMobile = useIsMobile()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false)
  const { topics, currentTopicId, isLoading, error, startNewTopic, selectTopic, deleteTopic } = useTopics()
  const router = useRouter()

  useEffect(() => {
    setIsCollapsed(isMobile)
  }, [isMobile])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      // Today - show time
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    } else if (diffInHours < 48) {
      // Yesterday - show time
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    } else if (diffInHours < 24 * 7) {
      // This week - show day and time
      return `${date.toLocaleDateString([], { weekday: "short" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    } else {
      // Older - show date and time
      return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }
  }

  const handleNewTopic = useCallback(() => {
    if (isCreatingNewTopic) {
      console.log("[v0] New topic creation already in progress, ignoring click")
      return
    }

    console.log("[v0] New Topic button clicked - clearing topic and navigating to compare")
    setIsCreatingNewTopic(true)

    try {
      startNewTopic()
      router.push("/compare")
    } finally {
      // Reset the flag after a short delay to allow navigation to complete
      setTimeout(() => {
        setIsCreatingNewTopic(false)
      }, 1000)
    }
  }, [isCreatingNewTopic, startNewTopic, router])

  if (isCollapsed) {
    return (
      <div className={cn("w-12 border-r bg-muted/10", className)}>
        <div className="p-2">
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)} className="w-8 h-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-80 border-r bg-muted/10 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">History</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} className="w-8 h-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={handleNewTopic}
          className="w-full mt-3"
          variant={currentTopicId ? "outline" : "default"}
          disabled={isCreatingNewTopic}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Topics List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading topics...</div>
          ) : error ? (
            <div className="text-center text-destructive py-8 px-4">
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 bg-transparent"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 px-4">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No topics yet</p>
              <p className="text-xs mt-1">Start a conversation to create your first topic</p>
            </div>
          ) : (
            <div className="space-y-1">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={cn(
                    "group relative rounded-lg p-3 cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    currentTopicId === topic.id && "bg-muted border",
                  )}
                  onClick={() => {
                    console.log("[v0] THREAD CLICKED - Starting click handler")
                    console.log("[v0] THREAD CLICKED - Topic ID:", topic.id)
                    console.log("[v0] THREAD CLICKED - Topic title:", topic.title)
                    console.log("[v0] THREAD CLICKED - Current topic ID before click:", currentTopicId)
                    console.log("[v0] THREAD CLICKED - About to call selectTopic")
                    selectTopic(topic.id)
                    console.log("[v0] THREAD CLICKED - selectTopic call completed")
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{topic.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{formatDate(topic.updated_at)}</span>
                        {topic.message_count && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{topic.message_count} messages</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 ml-2 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteTopic(topic.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
