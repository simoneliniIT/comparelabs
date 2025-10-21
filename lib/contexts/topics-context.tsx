"use client"

import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export interface Topic {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count?: number
}

export interface TopicMessage {
  id: string
  topic_id: string
  type: "question" | "answer"
  content: string
  model_name?: string
  created_at: string
}

interface TopicsContextType {
  topics: Topic[]
  currentTopicId: string | null
  currentTopicMessages: TopicMessage[]
  isLoadingMessages: boolean
  isLoading: boolean
  error: string | null
  isAuthEnabled: boolean
  createTopic: (firstQuestion: string) => Promise<string | null>
  addMessageToTopic: (
    topicId: string,
    type: "question" | "answer",
    content: string,
    modelName?: string,
  ) => Promise<void>
  startNewTopic: () => void
  selectTopic: (topicId: string) => void
  deleteTopic: (topicId: string) => Promise<void>
  loadTopics: () => Promise<void>
  loadTopicMessages: () => Promise<void>
}

const TopicsContext = createContext<TopicsContextType | null>(null)

export function TopicsProvider({ children }: { children: ReactNode }) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null)
  const [currentTopicMessages, setCurrentTopicMessages] = useState<TopicMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthEnabled, setIsAuthEnabled] = useState(false)
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)

  useEffect(() => {
    try {
      console.log("[v0] Initializing Supabase client in TopicsProvider")
      const client = createClient()
      setSupabase(client)
      setIsAuthEnabled(true)
      console.log("[v0] Supabase client created successfully in TopicsProvider")
    } catch (error) {
      console.error("[v0] Failed to create Supabase client:", error)
      setError(error instanceof Error ? error.message : "Failed to initialize Supabase client")
      setIsAuthEnabled(false)
      setIsLoading(false)
    }
  }, [])

  const loadTopics = useCallback(async () => {
    if (!supabase) {
      console.log("[v0] Supabase client not available, skipping topic loading")
      setIsAuthEnabled(false)
      setTopics([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      let user = null
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()
        user = authUser
        setIsAuthEnabled(true)
      } catch (authError) {
        console.log("[v0] Auth not available, running in demo mode:", authError)
        setIsAuthEnabled(false)
        setTopics([])
        setIsLoading(false)
        return
      }

      if (!user) {
        console.log("[v0] No authenticated user, running in demo mode")
        setIsAuthEnabled(false)
        setTopics([])
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("topics")
          .select(`
            id,
            title,
            created_at,
            updated_at
          `)
          .order("updated_at", { ascending: false })

        if (error) {
          if (error.message.includes("Could not find the table")) {
            console.log("[v0] Topics table not found - database setup may be needed")
            setTopics([])
            setError("Database setup required. Please run the database migration scripts.")
            return
          }
          throw error
        }

        setTopics(data || [])
      } catch (dbError) {
        console.error("[v0] Database operation failed:", dbError)
        setIsAuthEnabled(false)
        setTopics([])
      }
    } catch (err) {
      console.error("Error loading topics:", err)
      setError(err instanceof Error ? err.message : "Failed to load topics")
      setIsAuthEnabled(false)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (supabase) {
      loadTopics()
    }
  }, [supabase, loadTopics])

  const loadTopicMessages = useCallback(
    async (topicId?: string) => {
      const targetTopicId = topicId || currentTopicId

      if (!targetTopicId) {
        console.log("[v0] CONTEXT - No topic ID provided for message loading")
        setCurrentTopicMessages([])
        setIsLoadingMessages(false)
        return
      }

      if (!supabase) {
        console.log("[v0] Supabase client not available, skipping message loading")
        setCurrentTopicMessages([])
        setIsLoadingMessages(false)
        return
      }

      try {
        console.log("[v0] CONTEXT - Loading messages for topic:", targetTopicId)
        setIsLoadingMessages(true)
        setCurrentTopicMessages([])

        if (!isAuthEnabled || targetTopicId.startsWith("local-")) {
          console.log("[v0] CONTEXT - Skipping message loading - auth disabled or local topic")
          setCurrentTopicMessages([])
          setIsLoadingMessages(false)
          return
        }

        let user = null
        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser()
          user = authUser
        } catch (authError) {
          console.log("[v0] CONTEXT - Auth failed during message loading:", authError)
          setCurrentTopicMessages([])
          setIsLoadingMessages(false)
          return
        }

        if (!user) {
          console.log("[v0] CONTEXT - No authenticated user, skipping message loading")
          setCurrentTopicMessages([])
          setIsLoadingMessages(false)
          return
        }

        try {
          const { data, error } = await supabase
            .from("topic_messages")
            .select(`
            id,
            topic_id,
            type,
            content,
            model_name,
            created_at
          `)
            .eq("topic_id", targetTopicId)
            .order("created_at", { ascending: true })

          if (error) {
            console.log("[v0] CONTEXT - Error loading topic messages:", error)
            throw error
          }

          console.log("[v0] CONTEXT - Loaded messages for topic:", data?.length || 0)
          setCurrentTopicMessages(data || [])
        } catch (dbError) {
          console.error("[v0] CONTEXT - Database operation failed during message loading:", dbError)
          setCurrentTopicMessages([])
        }
      } catch (err) {
        console.error("[v0] CONTEXT - Error loading topic messages:", err)
        setCurrentTopicMessages([])
      } finally {
        setIsLoadingMessages(false)
      }
    },
    [supabase, isAuthEnabled, currentTopicId],
  )

  const createTopic = useCallback(
    async (firstQuestion: string): Promise<string | null> => {
      if (!supabase) {
        console.log("[v0] Supabase client not available, using local topic ID")
        const localTopicId = `local-${Date.now()}`
        setCurrentTopicId(localTopicId)
        return localTopicId
      }

      try {
        console.log("[v0] Creating new topic with question:", firstQuestion)

        if (!isAuthEnabled) {
          console.log("[v0] Auth not enabled, generating local topic ID")
          const localTopicId = `local-${Date.now()}`
          setCurrentTopicId(localTopicId)
          return localTopicId
        }

        let user = null
        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser()
          user = authUser
        } catch (authError) {
          console.log("[v0] Auth failed during topic creation:", authError)
          const localTopicId = `local-${Date.now()}`
          setCurrentTopicId(localTopicId)
          return localTopicId
        }

        if (!user) {
          console.log("[v0] No authenticated user, using local topic ID")
          const localTopicId = `local-${Date.now()}`
          setCurrentTopicId(localTopicId)
          return localTopicId
        }

        console.log("[v0] User authenticated for topic creation:", user.id)

        const title = await generateTopicTitle(firstQuestion)
        console.log("[v0] Generated topic title:", title)

        try {
          const { data, error } = await supabase
            .from("topics")
            .insert({
              user_id: user.id,
              title,
            })
            .select()
            .single()

          if (error) {
            console.log("[v0] Error creating topic:", error)
            throw error
          }

          console.log("[v0] Topic created successfully:", data.id)

          await addMessageToTopic(data.id, "question", firstQuestion)

          setCurrentTopicId(data.id)
          await loadTopics()

          console.log("[v0] Topic creation completed, current topic ID:", data.id)
          return data.id
        } catch (dbError) {
          console.log("[v0] Database operation failed, using local topic ID:", dbError)
          const localTopicId = `local-${Date.now()}`
          setCurrentTopicId(localTopicId)
          return localTopicId
        }
      } catch (err) {
        console.error("[v0] Error creating topic:", err)
        setError(err instanceof Error ? err.message : "Failed to create topic")
        const localTopicId = `local-${Date.now()}`
        setCurrentTopicId(localTopicId)
        return localTopicId
      }
    },
    [supabase, isAuthEnabled, loadTopics],
  )

  const addMessageToTopic = useCallback(
    async (topicId: string, type: "question" | "answer", content: string, modelName?: string) => {
      if (!supabase) {
        console.log("[v0] Supabase client not available, skipping message storage")
        return
      }

      try {
        console.log(`[v0] Adding ${type} message to topic ${topicId}`, modelName ? `(model: ${modelName})` : "")

        if (!isAuthEnabled || topicId.startsWith("local-")) {
          console.log("[v0] Skipping message storage - auth disabled or local topic")
          return
        }

        let user = null
        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser()
          user = authUser
        } catch (authError) {
          console.log("[v0] Auth failed during message add:", authError)
          return
        }

        if (!user) {
          console.log("[v0] No authenticated user, skipping message storage")
          return
        }

        try {
          const { error } = await supabase.from("topic_messages").insert({
            topic_id: topicId,
            user_id: user.id,
            type,
            content,
            model_name: modelName,
          })

          if (error) {
            console.log("[v0] Error adding message to topic:", error)
            throw error
          }

          console.log(`[v0] ${type} message added successfully to topic ${topicId}`)

          await supabase.from("topics").update({ updated_at: new Date().toISOString() }).eq("id", topicId)

          await loadTopics()
        } catch (dbError) {
          console.log("[v0] Database operation failed during message add:", dbError)
        }
      } catch (err) {
        console.error("[v0] Error adding message to topic:", err)
        setError(err instanceof Error ? err.message : "Failed to add message")
      }
    },
    [supabase, isAuthEnabled, loadTopics],
  )

  const generateTopicTitle = async (question: string): Promise<string> => {
    try {
      const words = question.split(" ").slice(0, 6)
      let title = words.join(" ")
      if (question.split(" ").length > 6) {
        title += "..."
      }
      return title || "New Topic"
    } catch (err) {
      console.error("Error generating topic title:", err)
      return "New Topic"
    }
  }

  const startNewTopic = useCallback(() => {
    console.log("[v0] Starting new topic - clearing current topic ID")
    setCurrentTopicId(null)
    setCurrentTopicMessages([])
  }, [])

  const selectTopic = useCallback(
    (topicId: string) => {
      console.log("[v0] CONTEXT - Selecting topic:", topicId)
      console.log("[v0] CONTEXT - selectTopic - topicId type:", typeof topicId)
      console.log("[v0] CONTEXT - selectTopic - topicId value:", JSON.stringify(topicId))

      console.log("[v0] CONTEXT - selectTopic - current currentTopicId before update:", currentTopicId)
      setCurrentTopicId(topicId)
      console.log("[v0] CONTEXT - selectTopic - setCurrentTopicId called with:", topicId)

      loadTopicMessages(topicId)
    },
    [loadTopicMessages, currentTopicId],
  )

  const deleteTopic = useCallback(
    async (topicId: string) => {
      if (!supabase) {
        console.log("[v0] Supabase client not available, skipping topic deletion")
        if (currentTopicId === topicId) {
          setCurrentTopicId(null)
          setCurrentTopicMessages([])
        }
        return
      }

      try {
        if (!isAuthEnabled || topicId.startsWith("local-")) {
          console.log("[v0] Skipping topic deletion - auth disabled or local topic")
          if (currentTopicId === topicId) {
            setCurrentTopicId(null)
            setCurrentTopicMessages([])
          }
          return
        }

        const { error } = await supabase.from("topics").delete().eq("id", topicId)

        if (error) throw error

        if (currentTopicId === topicId) {
          setCurrentTopicId(null)
          setCurrentTopicMessages([])
        }

        await loadTopics()
      } catch (err) {
        console.error("Error deleting topic:", err)
        setError(err instanceof Error ? err.message : "Failed to delete topic")
      }
    },
    [supabase, isAuthEnabled, currentTopicId, loadTopics],
  )

  const value: TopicsContextType = useMemo(
    () => ({
      topics,
      currentTopicId,
      currentTopicMessages,
      isLoadingMessages,
      isLoading,
      error,
      isAuthEnabled,
      createTopic,
      addMessageToTopic,
      startNewTopic,
      selectTopic,
      deleteTopic,
      loadTopics,
      loadTopicMessages,
    }),
    [
      topics,
      currentTopicId,
      currentTopicMessages,
      isLoadingMessages,
      isLoading,
      error,
      isAuthEnabled,
      createTopic,
      addMessageToTopic,
      startNewTopic,
      selectTopic,
      deleteTopic,
      loadTopics,
      loadTopicMessages,
    ],
  )

  return <TopicsContext.Provider value={value}>{children}</TopicsContext.Provider>
}

export function useTopics() {
  const context = useContext(TopicsContext)
  if (!context) {
    throw new Error("useTopics must be used within a TopicsProvider")
  }
  return context
}
