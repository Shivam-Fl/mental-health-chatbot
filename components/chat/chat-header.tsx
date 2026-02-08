"use client"

import { Button } from "@/components/ui/button"
import { Menu, Brain, Video, Mic } from "lucide-react"

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatHeaderProps {
  currentConversation: Conversation | null
  onToggleSidebar: () => void
}

export function ChatHeader({ currentConversation, onToggleSidebar }: ChatHeaderProps) {
  return (
    <div className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4">
      <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden mr-2">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">MindfulAI</h1>
            <p className="text-xs text-muted-foreground">Your Mental Health Companion</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Mic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Video className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
