"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Smile } from "lucide-react"

interface ChatInputProps {
  onSendMessage: (content: string, messageType?: "text" | "audio" | "video") => void
  conversationId?: string
}

export function ChatInput({ onSendMessage, conversationId }: Readonly<ChatInputProps>) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message.trim(), "text")
      setMessage("")
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  return (
    <div className="border-t border-border bg-card/50 backdrop-blur-sm p-3 sm:p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 sm:gap-3 max-w-5xl mx-auto">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[48px] max-h-[120px] resize-none pr-12 bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all rounded-2xl text-sm sm:text-base py-3 px-4"
            rows={1}
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={!message.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow-md transition-all rounded-full h-12 w-12 flex-shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </form>
    </div>
  )
}
