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
    <div className="h-16 border-b border-border bg-card flex items-center px-6">
      <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden mr-3">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Aura</h1>
          <p className="text-xs text-muted-foreground">Your Mental Health Companion</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Mic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Video className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
