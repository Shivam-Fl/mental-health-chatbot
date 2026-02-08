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
    <div className="bg-gradient-to-r from-white/95 to-blue-50/95 dark:from-slate-900/95 dark:to-blue-950/95 backdrop-blur-sm border-t border-border/50">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-border/50 shadow-lg">
            <TabsTrigger 
              value="text" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Text Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="audio" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105"
            >
              <Mic className="h-4 w-4" />
              <span className="font-medium">Voice Chat</span>
            </TabsTrigger>
            <TabsTrigger 
              value="video" 
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105"
            >
              <Video className="h-4 w-4" />
              <span className="font-medium">Video Call</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="text" className="p-6 mt-0">
          <div className="bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-6 border border-blue-200/50 dark:border-blue-800/50 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Text Chat Mode</span>
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-4">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Share what's on your mind... I'm here to listen and support you."
                  className="min-h-[50px] max-h-[120px] resize-none pr-14 bg-white/90 dark:bg-slate-800/90 border-2 border-blue-200 dark:border-blue-800 focus:border-blue-400 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-200/50 dark:focus:ring-blue-800/50 transition-all duration-300 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!message.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 rounded-xl px-6 py-3"
              >
                <Send className="h-5 w-5 mr-2" />
                Send
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-lg py-2 px-4">
                💬 Your conversations are private and secure. This AI provides support but is not a replacement for
                professional therapy.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="audio" className="p-6 mt-0">
          <div className="bg-gradient-to-br from-green-50/80 to-blue-50/80 dark:from-green-950/30 dark:to-blue-950/30 rounded-xl p-6 border border-green-200/50 dark:border-green-800/50 shadow-lg backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Voice Chat Mode</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg py-2 px-4">
                🎤 Speak naturally - I'll listen and respond with voice
              </p>
            </div>
            <AudioControls onTranscriptReceived={handleAudioTranscript} conversationId={conversationId} />
          </div>
        </TabsContent>

        <TabsContent value="video" className="p-4 mt-0">
          <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50 shadow-lg backdrop-blur-sm">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Video Call Mode</span>
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 rounded-lg py-2 px-3">
                📹 Face-to-face conversation with emotion analysis and voice response
              </p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <VideoCall
                conversationId={conversationId}
                onSendMessage={onSendMessage}
              />
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
