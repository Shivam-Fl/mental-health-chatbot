"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Send, Mic, MessageSquare, Video } from "lucide-react"
import { AudioControls } from "./audio-controls"
import { VideoCall } from "./video-call"

interface ChatInputProps {
  onSendMessage: (content: string, messageType?: "text" | "audio" | "video") => void
  conversationId?: string
}

export function ChatInput({ onSendMessage, conversationId }: Readonly<ChatInputProps>) {
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState("text")
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

  const handleAudioTranscript = (transcript: string) => {
    // Audio is handled automatically by the audio controls
    console.log("Audio transcript received:", transcript)
  }


  return (
    <div className="bg-card border-t border-border">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
            <TabsTrigger 
              value="text" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            <TabsTrigger 
              value="audio" 
              className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg transition-all"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger 
              value="video" 
              className="flex items-center gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-lg transition-all"
            >
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Video</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="text" className="p-6 mt-0 space-y-3">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind... I'm here to listen."
                className="min-h-[60px] max-h-[120px] resize-none pr-14 bg-muted/50 border-2 border-input focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl text-base"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={!message.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all rounded-xl h-[60px] px-6"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            Your conversations are private and secure
          </p>
        </TabsContent>

        <TabsContent value="audio" className="p-6 mt-0 space-y-4">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              🎤 Speak naturally - I'll listen and respond with voice
            </p>
          </div>
          <AudioControls onTranscriptReceived={handleAudioTranscript} conversationId={conversationId} />
        </TabsContent>

        <TabsContent value="video" className="p-6 mt-0 space-y-4">
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">
              📹 Face-to-face conversation with emotion analysis
            </p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <VideoCall
              conversationId={conversationId}
              onSendMessage={onSendMessage}
            />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
