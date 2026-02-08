"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Plus, MoreVertical, Download, Edit, Trash2, FileText, Calendar, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Conversation {
  id: string
  title: string
  summary: string
  notes: string
  created_at: string
  updated_at: string
  messages: { count: number }[]
}

interface ConversationManagerProps {
  onSelectConversation: (id: string) => void
  currentConversationId?: string
}

export function ConversationManager({ onSelectConversation, currentConversationId }: ConversationManagerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [editingConversation, setEditingConversation] = useState<Conversation | null>(null)

  useEffect(() => {
    loadConversations()
  }, [searchQuery])

  const loadConversations = async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append("search", searchQuery)

      const response = await fetch(`/api/conversations?${params}`)
      const data = await response.json()

      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error("Failed to load conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Session" }),
      })

      const data = await response.json()
      if (data.conversation) {
        setConversations([data.conversation, ...conversations])
        onSelectConversation(data.conversation.id)
      }
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      if (data.conversation) {
        setConversations(conversations.map((c) => (c.id === id ? data.conversation : c)))
        setEditingConversation(null)
      }
    } catch (error) {
      console.error("Failed to update conversation:", error)
    }
  }

  const deleteConversation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      return
    }

    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      setConversations(conversations.filter((c) => c.id !== id))

      if (currentConversationId === id) {
        // Select the first remaining conversation or create a new one
        const remaining = conversations.filter((c) => c.id !== id)
        if (remaining.length > 0) {
          onSelectConversation(remaining[0].id)
        } else {
          createNewConversation()
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    }
  }

  const exportConversation = async (id: string, format: "json" | "txt" | "pdf") => {
    try {
      const response = await fetch(`/api/conversations/${id}/export?format=${format}`)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `conversation-${id}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Failed to export conversation:", error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and New Conversation */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={createNewConversation} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Conversations List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? "No conversations found" : "No conversations yet. Start a new session!"}
          </div>
        ) : (
          conversations.map((conversation) => (
            <Card
              key={conversation.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                currentConversationId === conversation.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium truncate">{conversation.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                      <MessageSquare className="h-3 w-3 ml-2" />
                      {conversation.messages?.[0]?.count || 0} messages
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
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
                          exportConversation(conversation.id, "txt")
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export as Text
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          exportConversation(conversation.id, "json")
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteConversation(conversation.id)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {conversation.summary && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground line-clamp-2">{conversation.summary}</p>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Edit Conversation Dialog */}
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
                <Button
                  onClick={() =>
                    updateConversation(editingConversation.id, {
                      title: editingConversation.title,
                      summary: editingConversation.summary,
                      notes: editingConversation.notes,
                    })
                  }
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
