"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ChatHeader } from "./chat-header"
import { CrisisAlert } from "./crisis-alert"
import { EmotionTracker } from "../emotion/emotion-tracker"
import { SessionAnalytics } from "./session-analytics"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"

interface Conversation {
  id: string
  title: string
  summary?: string
  notes?: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  message_type: "text" | "audio" | "video"
  emotion_detected?: string
  created_at: string
}

interface ChatInterfaceProps {
  user: User
}

export function ChatInterface({ user }: Readonly<ChatInterfaceProps>) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [showCrisisAlert, setShowCrisisAlert] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const supabase = createClient()

  const { speakText } = useSpeechSynthesis({
    onStart: () => console.log("[v0] TTS started"),
    onEnd: () => console.log("[v0] TTS ended"),
    onError: (error) => console.error("[v0] TTS error:", error),
  })

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id)
    }
  }, [currentConversation])

  // Check for crisis emotions in messages
  useEffect(() => {
    const hasCrisisEmotion = messages.some((msg) => msg.emotion_detected === "crisis")
    setShowCrisisAlert(hasCrisisEmotion)
  }, [messages])

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false })

      if (error) throw error
      setConversations(data || [])

      // Select first conversation or create new one
      if (data && data.length > 0) {
        setCurrentConversation(data[0])
      } else {
        await createNewConversation()
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: "New Conversation",
        })
        .select()
        .single()

      if (error) throw error

      const newConversation = data
      setConversations((prev) => [newConversation, ...prev])
      setCurrentConversation(newConversation)
      setMessages([])
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    try {
      const { data, error } = await supabase.from("conversations").update(updates).eq("id", id).select().single()

      if (error) throw error

      setConversations(conversations.map((c) => (c.id === id ? { ...c, ...data } : c)))

      if (currentConversation?.id === id) {
        setCurrentConversation({ ...currentConversation, ...data })
      }
    } catch (error) {
      console.error("Failed to update conversation:", error)
    }
  }

  const deleteConversation = async (id: string) => {
    console.log("[DEBUG] Delete conversation called for ID:", id)
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      console.log("[DEBUG] Delete cancelled by user")
      return
    }

    try {
      console.log("[DEBUG] Attempting to delete conversation from database")
      const { error } = await supabase.from("conversations").delete().eq("id", id)
      
      if (error) {
        console.error("[DEBUG] Database delete error:", error)
        throw error
      }
      
      console.log("[DEBUG] Database delete successful, updating UI")
      setConversations(conversations.filter((c) => c.id !== id))

      if (currentConversation?.id === id) {
        console.log("[DEBUG] Deleted conversation was current, switching to another")
        const remaining = conversations.filter((c) => c.id !== id)
        if (remaining.length > 0) {
          setCurrentConversation(remaining[0])
        } else {
          console.log("[DEBUG] No remaining conversations, creating new one")
          await createNewConversation()
        }
      }
      console.log("[DEBUG] Delete operation completed successfully")
    } catch (error) {
      console.error("Failed to delete conversation:", error)
      alert("Failed to delete conversation. Please try again.")
    }
  }

  const exportConversation = async (id: string, format: "json" | "txt" | "pdf") => {
    try {
      const response = await fetch(`/api/conversations/${id}/export?format=${format}`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `session-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export conversation:", error)
    }
  }

  const sendMessage = async (content: string, messageType: "text" | "audio" | "video" = "text") => {
    if (!currentConversation) return

    try {
      console.log("[v0] Sending message:", { content, messageType, conversationId: currentConversation.id })

      // Add user message to UI immediately
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: "user",
        content,
        message_type: messageType,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])

      // Save user message to database
      const { data: savedUserMessage, error: userError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "user",
          content,
          message_type: messageType,
        })
        .select()
        .single()

      if (userError) throw userError

      // Update the temporary message with real ID
      setMessages((prev) => prev.map((msg) => (msg.id === userMessage.id ? { ...savedUserMessage } : msg)))

      let apiEndpoint = "/api/chat"
      if (messageType === "video") {
        apiEndpoint = "/api/chat/video"
      } else if (messageType === "audio") {
        apiEndpoint = "/api/chat/audio"
      }

      let requestBody: any
      if (messageType === "video") {
        requestBody = {
          transcript: content,
          conversationId: currentConversation.id,
        }
      } else if (messageType === "audio") {
        requestBody = {
          transcript: content,
          conversationId: currentConversation.id,
        }
      } else {
        requestBody = {
          message: content,
          conversationId: currentConversation.id,
          messageType,
        }
      }

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log("[v0] AI API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] AI API error:", response.status, errorText)
        throw new Error(`Failed to get AI response: ${response.status}`)
      }

      const aiResponse = await response.json()
      console.log("[v0] AI response received:", aiResponse)

      const responseContent = aiResponse.content || aiResponse.response || aiResponse.message || "I'm here to help."

      // Add AI response to messages
      const assistantMessage: Message = {
        id: `temp-ai-${Date.now()}`,
        role: "assistant",
        content: responseContent,
        message_type: "text",
        emotion_detected: aiResponse.emotion_detected,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMessage])

      // Save AI message to database
      const { data: savedAiMessage, error: aiError } = await supabase
        .from("messages")
        .insert({
          conversation_id: currentConversation.id,
          role: "assistant",
          content: responseContent,
          message_type: "text",
          emotion_detected: aiResponse.emotion_detected,
        })
        .select()
        .single()

      if (aiError) throw aiError

      // Update the temporary AI message with real ID
      setMessages((prev) => prev.map((msg) => (msg.id === assistantMessage.id ? { ...savedAiMessage } : msg)))

      if ((messageType === "video" || messageType === "audio") && responseContent) {
        try {
          await speakText(responseContent)
        } catch (ttsError) {
          console.error("[v0] TTS error:", ttsError)
        }
      }

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversation.id)
    } catch (error) {
      console.error("[v0] Error sending message:", error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-950">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" 
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-card/95 backdrop-blur-xl border-r border-border/50
        transform transition-all duration-300 ease-in-out lg:translate-x-0 shadow-xl
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        <ChatSidebar
          conversations={conversations}
          currentConversation={currentConversation}
          onSelectConversation={setCurrentConversation}
          onNewConversation={createNewConversation}
          onUpdateConversation={updateConversation}
          onDeleteConversation={deleteConversation}
          onExportConversation={exportConversation}
          onLogout={handleLogout}
          user={user}
        />
      </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <ChatHeader
            currentConversation={currentConversation}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {currentConversation && (
            <div className="px-4 py-3 border-b border-border/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">Active Session</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowAnalytics(!showAnalytics)} 
                  className="bg-white/80 hover:bg-white dark:bg-slate-800/80 dark:hover:bg-slate-800 shadow-sm"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {showAnalytics ? "Hide Analytics" : "Show Analytics"}
                </Button>
              </div>
            </div>
          )}

          {/* Crisis Alert */}
          {showCrisisAlert && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-800">
              <CrisisAlert onDismiss={() => setShowCrisisAlert(false)} />
            </div>
          )}

          {showAnalytics && currentConversation ? (
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900">
              <SessionAnalytics conversationId={currentConversation.id} />
            </div>
          ) : (
            <>
              {currentConversation && (
                <div className="px-4 py-3 bg-gradient-to-r from-green-50/50 to-blue-50/50 dark:from-green-950/20 dark:to-blue-950/20 border-b border-border/50">
                  <EmotionTracker conversationId={currentConversation.id} />
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-hidden bg-gradient-to-br from-white/90 to-blue-50/30 dark:from-slate-900/90 dark:to-blue-950/30">
                <ChatMessages messages={messages} />
              </div>

              {/* Input */}
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-border/50">
                <ChatInput onSendMessage={sendMessage} conversationId={currentConversation?.id} />
              </div>
            </>
          )}
        </div>
    </div>
  )
}
