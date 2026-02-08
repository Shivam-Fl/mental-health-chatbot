"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { ChatSidebar } from "./chat-sidebar"
import { ChatMessages } from "./chat-messages"
import { ChatInput } from "./chat-input"
import { ChatHeader } from "./chat-header"
import { CrisisAlert } from "./crisis-alert"
import { FullscreenAudioCall } from "./fullscreen-audio-call"
import { FullscreenVideoCall } from "./fullscreen-video-call"
import { Button } from "@/components/ui/button"
import { BarChart3, X } from "lucide-react"
import { SessionAnalytics } from "./session-analytics"

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
  const [showAudioCall, setShowAudioCall] = useState(false)
  const [showVideoCall, setShowVideoCall] = useState(false)
  const supabase = createClient()

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
    if (!confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("conversations").delete().eq("id", id)
      
      if (error) throw error
      
      setConversations(conversations.filter((c) => c.id !== id))

      if (currentConversation?.id === id) {
        const remaining = conversations.filter((c) => c.id !== id)
        if (remaining.length > 0) {
          setCurrentConversation(remaining[0])
        } else {
          await createNewConversation()
        }
      }
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

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`)
      }

      const aiResponse = await response.json()
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

      // Update conversation timestamp
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", currentConversation.id)
    } catch (error) {
      console.error("Error sending message:", error)
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
    <>
      <div className="h-screen flex bg-background">
        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" 
            onClick={() => setIsSidebarOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setIsSidebarOpen(false)}
            role="button"
            tabIndex={0}
          />
        )}

        {/* Sidebar */}
        <div
          className={`
          fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-card border-r border-border
          transform transition-all duration-300 ease-in-out lg:translate-x-0 shadow-lg lg:shadow-none
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
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <ChatHeader
            currentConversation={currentConversation}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onStartAudioCall={() => setShowAudioCall(true)}
            onStartVideoCall={() => setShowVideoCall(true)}
          />

          {/* Crisis Alert */}
          {showCrisisAlert && (
            <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20">
              <CrisisAlert onDismiss={() => setShowCrisisAlert(false)} />
            </div>
          )}

          {/* Analytics toggle - simplified */}
          {currentConversation && !showAnalytics && (
            <div className="px-4 py-2 border-b border-border bg-card/30 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAnalytics(true)} 
                className="text-xs"
              >
                <BarChart3 className="h-3 w-3 mr-2" />
                View Analytics
              </Button>
            </div>
          )}

          {showAnalytics && currentConversation ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/30">
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Session Analytics</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAnalytics(false)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
                <SessionAnalytics conversationId={currentConversation.id} />
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-hidden bg-background">
                <ChatMessages messages={messages} />
              </div>

              {/* Input */}
              <ChatInput onSendMessage={sendMessage} conversationId={currentConversation?.id} />
            </>
          )}
        </div>
      </div>

      {/* Full-screen modals */}
      {showAudioCall && (
        <FullscreenAudioCall 
          conversationId={currentConversation?.id}
          onClose={() => setShowAudioCall(false)}
        />
      )}

      {showVideoCall && (
        <FullscreenVideoCall 
          conversationId={currentConversation?.id}
          onClose={() => setShowVideoCall(false)}
        />
      )}
    </>
  )
}
