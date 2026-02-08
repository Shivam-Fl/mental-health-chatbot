"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Brain, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmotionIndicator } from "./emotion-indicator"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  message_type: "text" | "audio" | "video"
  emotion_detected?: string
  created_at: string
}

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (messages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Welcome to MindfulAI</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            I&apos;m here to provide compassionate mental health support. You can share your thoughts through text,
            voice, or video. Everything you share is private and secure.
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            Start by typing a message below or click the microphone for voice chat.
          </p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef}>
      <div className="p-4 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3 max-w-4xl", message.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback
                className={cn(
                  "text-xs",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {message.role === "user" ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>

            <div
              className={cn(
                "flex flex-col gap-1 min-w-0 flex-1",
                message.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[80%] break-words",
                  message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatTime(message.created_at)}</span>
                {message.message_type !== "text" && <span className="capitalize">• {message.message_type}</span>}
                {message.emotion_detected && message.emotion_detected !== "neutral" && (
                  <EmotionIndicator emotion={message.emotion_detected} />
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
