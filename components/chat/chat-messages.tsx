"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Brain, User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmotionIndicator } from "./emotion-indicator"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  message_type: "text" | "audio" | "video" | "emotion_event"
  emotion_detected?: string
  created_at: string
}

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Filter out silent emotion-event rows (used for realtime video analytics)
  const visibleMessages = messages.filter((m) => m.message_type !== "emotion_event" && m.content)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (visibleMessages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Brain className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold mb-3">Welcome to Aura</h3>
          <p className="text-muted-foreground text-base leading-relaxed mb-6">
            I&apos;m here to provide compassionate mental health support. Share your thoughts through text,
            voice, or video. Everything you share is private and secure.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Your conversations are confidential</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-4", message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}
          >
            <Avatar className="h-10 w-10 shrink-0 border-2 border-border">
              <AvatarFallback
                className={cn(
                  "text-xs font-medium",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {message.role === "user" ? <User className="h-5 w-5" /> : <Brain className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                "flex flex-col gap-2 min-w-0 max-w-[75%]",
                message.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-5 py-3 break-words shadow-sm",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-muted text-foreground rounded-tl-sm border border-border",
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <span>{formatTime(message.created_at)}</span>
                {message.message_type !== "text" && <span className="capitalize">• {message.message_type}</span>}
                {message.emotion_detected && message.emotion_detected !== "neutral" && (
                  <>
                    <span>•</span>
                    <EmotionIndicator emotion={message.emotion_detected} />
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
