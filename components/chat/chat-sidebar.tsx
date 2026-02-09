"use client"

import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Plus,
  MessageSquare,
  LogOut,
  Settings,
  BarChart3,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

interface Conversation {
  id: string
  title: string
  summary?: string
  notes?: string
  created_at: string
  updated_at: string
  messages?: { count: number }[]
}

interface ChatSidebarProps {
  conversations: Conversation[]
  currentConversation: Conversation | null
  onSelectConversation: (conversation: Conversation) => void
  onNewConversation: () => void
  onUpdateConversation: (id: string, updates: Partial<Conversation>) => void
  onDeleteConversation: (id: string) => void
  onExportConversation: (id: string, format: "json" | "txt" | "pdf") => void
  onLogout: () => void
  user: User
}

export function ChatSidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onUpdateConversation,
  onDeleteConversation,
  onExportConversation,
  onLogout,
  user,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null)

  const getUserInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true })
  }

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conv.summary && conv.summary.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleUpdateConversation = () => {
    if (editingConversation) {
      onUpdateConversation(editingConversation.id, {
        title: editingConversation.title,
        summary: editingConversation.summary,
        notes: editingConversation.notes,
      })
      setEditingConversation(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-card to-background border-r border-border/50">
      {/* Header */}
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="h-10 w-10 ring-2 ring-blue-200 dark:ring-blue-800">
            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
              {getUserInitials(user.email || "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-foreground">{user.user_metadata?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>

        <Button
          onClick={onNewConversation}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 mb-3"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>

        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="w-full bg-card/80 hover:bg-card border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics Dashboard
          </Button>
        </Link>

        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-card/90 border-border focus:border-blue-400 dark:focus:border-blue-600 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-800/50 transition-all duration-200"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 bg-gradient-to-b from-card/50 to-muted/50">
        <div className="p-3">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-12 bg-card/80 rounded-xl border border-border m-2">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">{searchQuery ? "No sessions found" : "No sessions yet"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? "Try a different search term" : "Start a new session to begin"}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative rounded-xl p-4 mb-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  currentConversation?.id === conversation.id 
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800 shadow-md" 
                    : "bg-card/90 hover:bg-card border border-border hover:border-blue-200 dark:hover:border-blue-800"
                }`}
                onClick={(e) => {
                  // Don't select conversation if clicking on dropdown
                  if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
                    return;
                  }
                  onSelectConversation(conversation)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{conversation.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(conversation.updated_at)}</p>
                    {conversation.summary && (
                      <p className="text-xs text-foreground mt-1 line-clamp-2">{conversation.summary}</p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-20 relative hover:bg-muted bg-transparent border-0 rounded flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                        data-dropdown-trigger="true"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingConversation(conversation)
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onExportConversation(conversation.id, "txt")
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export as Text
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteConversation(conversation.id)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-gradient-to-r from-muted/50 to-primary/5">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 hover:bg-card text-foreground transition-all duration-200">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout} className="hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={!!editingConversation} onOpenChange={() => setEditingConversation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session Details</DialogTitle>
          </DialogHeader>

          {editingConversation && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Session Title</label>
                <Input
                  value={editingConversation.title}
                  onChange={(e) =>
                    setEditingConversation({
                      ...editingConversation,
                      title: e.target.value,
                    })
                  }
                  placeholder="Enter session title..."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Summary</label>
                <Textarea
                  value={editingConversation.summary || ""}
                  onChange={(e) =>
                    setEditingConversation({
                      ...editingConversation,
                      summary: e.target.value,
                    })
                  }
                  placeholder="Brief summary of this session..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Session Notes</label>
                <Textarea
                  value={editingConversation.notes || ""}
                  onChange={(e) =>
                    setEditingConversation({
                      ...editingConversation,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Private notes about this session..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingConversation(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateConversation}>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
