"use client"

import { Button } from "@/components/ui/button"
import { Menu, Brain, Video, Phone } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatHeaderProps {
  currentConversation: Conversation | null
  onToggleSidebar: () => void
  onStartAudioCall?: () => void
  onStartVideoCall?: () => void
}

export function ChatHeader({ currentConversation, onToggleSidebar, onStartAudioCall, onStartVideoCall }: ChatHeaderProps) {
  return (
    <div className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 sm:px-6 sticky top-0 z-10 shadow-sm">
      <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden mr-3">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold truncate">Aura</h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
      </div>

      <TooltipProvider>
        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
                onClick={onStartAudioCall}
              >
                <Phone className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start Voice Call</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-foreground hover:bg-accent rounded-full"
                onClick={onStartVideoCall}
              >
                <Video className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Start Video Call</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}
