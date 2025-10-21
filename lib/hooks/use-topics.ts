"use client"

import { useState, useEffect } from "react"
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

export function useTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [currentTopicId, setCurrentTopicId] = useState<string | null>(null)
  const [currentTopicMessages, setCurrentTopicMessages] = useState<TopicMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAuthEnabled, setIsAuthEnabled] = useState(false)

  const supabase = createClient()

  const loadTopics = async () => {
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
  }

  const createTopic = async (firstQuestion: string): Promise<string | null> => {
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

      // Generate title using the first question
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

        // Add the first question as a message
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
  }

  const addMessageToTopic = async (
    topicId: string,
    type: "question" | "answer",
    content: string,
    modelName?: string,
  ) => {
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

        // Update topic's updated_at timestamp
        await supabase.from("topics").update({ updated_at: new Date().toISOString() }).eq("id", topicId)

        await loadTopics()
      } catch (dbError) {
        console.log("[v0] Database operation failed during message add:", dbError)
        // Continue without throwing - don't block the user experience
      }
    } catch (err) {
      console.error("[v0] Error adding message to topic:", err)
      setError(err instanceof Error ? err.message : "Failed to add message")
    }
  }

  const generateTopicTitle = async (question: string): Promise<string> => {
    try {
      // Use a simple approach to generate title from the question
      // In a real app, you might want to use an LLM API for this
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

  const startNewTopic = () => {
    console.log("[v0] Starting new topic - clearing current topic ID")
    setCurrentTopicId(null)
  }

  const selectTopic = (topicId: string) => {
    console.log("[v0] Selecting topic:", topicId)
    console.log("[v0] selectTopic - topicId type:", typeof topicId)
    console.log("[v0] selectTopic - topicId value:", JSON.stringify(topicId))

    console.log("[v0] selectTopic - current currentTopicId before update:", currentTopicId)
    setCurrentTopicId(topicId)
    console.log("[v0] selectTopic - setCurrentTopicId called with:", topicId)

    loadTopicMessages(topicId)
  }

  const deleteTopic = async (topicId: string) => {
    try {
      if (!isAuthEnabled || topicId.startsWith("local-")) {
        console.log("[v0] Skipping topic deletion - auth disabled or local topic")
        if (currentTopicId === topicId) {
          setCurrentTopicId(null)
        }
        return
      }

      const { error } = await supabase.from("topics").delete().eq("id", topicId)

      if (error) throw error

      if (currentTopicId === topicId) {
        setCurrentTopicId(null)
      }

      await loadTopics()
    } catch (err) {
      console.error("Error deleting topic:", err)
      setError(err instanceof Error ? err.message : "Failed to delete topic")
    }
  }

  const loadTopicMessages = async (topicId: string) => {
    try {
      console.log("[v0] Loading messages for topic:", topicId)
      setIsLoadingMessages(true)
      setCurrentTopicMessages([])

      if (!isAuthEnabled || topicId.startsWith("local-")) {
        console.log("[v0] Skipping message loading - auth disabled or local topic")
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
        console.log("[v0] Auth failed during message loading:", authError)
        setCurrentTopicMessages([])
        setIsLoadingMessages(false)
        return
      }

      if (!user) {
        console.log("[v0] No authenticated user, skipping message loading")
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
          .eq("topic_id", topicId)
          .order("created_at", { ascending: true })

        if (error) {
          console.log("[v0] Error loading topic messages:", error)
          throw error
        }

        console.log("[v0] Loaded messages for topic:", data?.length || 0)
        setCurrentTopicMessages(data || [])
      } catch (dbError) {
        console.error("[v0] Database operation failed during message loading:", dbError)
        setCurrentTopicMessages([])
      }
    } catch (err) {
      console.error("[v0] Error loading topic messages:", err)
      setCurrentTopicMessages([])
    } finally {
      setIsLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadTopics()
  }, [])

  return {
    topics,
    currentTopicId,
    currentTopicMessages,
    isLoadingMessages,
    isLoading,
    error,
    isAuthEnabled, // Expose auth status
    createTopic,
    addMessageToTopic,
    startNewTopic,
    selectTopic,
    deleteTopic,
    loadTopics,
    loadTopicMessages,
  }
}
