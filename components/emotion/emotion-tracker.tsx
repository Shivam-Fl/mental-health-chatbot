"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { EmotionIndicator } from "../chat/emotion-indicator"
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface RecentEmotion {
  emotion_type: string
  confidence: number
  created_at: string
}

interface EmotionTrackerProps {
  conversationId?: string
}

export function EmotionTracker({ conversationId }: EmotionTrackerProps) {
  const [recentEmotions, setRecentEmotions] = useState<RecentEmotion[]>([])
  const [emotionTrend, setEmotionTrend] = useState<"improving" | "declining" | "stable">("stable")
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(true) // Collapsible state

  const supabase = createClient()

  useEffect(() => {
    if (conversationId) {
      loadRecentEmotions()
    }
  }, [conversationId])

  const loadRecentEmotions = async () => {
    try {
      setIsLoading(true)

      // Get recent emotions from current conversation
      const { data: messages } = await supabase
        .from("messages")
        .select("id, emotion_detected, created_at")
        .eq("conversation_id", conversationId)
        .not("emotion_detected", "is", null)
        .order("created_at", { ascending: false })
        .limit(10)

      if (messages) {
        const emotions: RecentEmotion[] = messages.map((msg) => ({
          emotion_type: msg.emotion_detected,
          confidence: 0.8, // Default confidence for text-based detection
          created_at: msg.created_at,
        }))

        setRecentEmotions(emotions)
        analyzeTrend(emotions)
      }
    } catch (error) {
      console.error("Error loading recent emotions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeTrend = (emotions: RecentEmotion[]) => {
    if (emotions.length < 3) {
      setEmotionTrend("stable")
      return
    }

    const positiveEmotions = ["joy", "neutral"]
    const negativeEmotions = ["anxiety", "depression", "anger", "stress", "crisis"]

    const recent = emotions.slice(0, 3)
    const previous = emotions.slice(3, 6)

    const recentPositive = recent.filter((e) => positiveEmotions.includes(e.emotion_type)).length
    const previousPositive = previous.filter((e) => positiveEmotions.includes(e.emotion_type)).length

    if (recentPositive > previousPositive) {
      setEmotionTrend("improving")
    } else if (recentPositive < previousPositive) {
      setEmotionTrend("declining")
    } else {
      setEmotionTrend("stable")
    }
  }

  const getTrendIcon = () => {
    switch (emotionTrend) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getTrendColor = () => {
    switch (emotionTrend) {
      case "improving":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      case "declining":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  if (isLoading || recentEmotions.length === 0) {
    return null
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm">Emotion Tracking</CardTitle>
                <CardDescription className="text-xs">Your recent emotional state</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getTrendColor()}>
                  {getTrendIcon()}
                  <span className="ml-1 capitalize">{emotionTrend}</span>
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2 mb-3">
              {recentEmotions.slice(0, 5).map((emotion, index) => (
                <EmotionIndicator key={index} emotion={emotion.emotion_type} className="text-xs" />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last {recentEmotions.length} emotions detected</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                <a href="/dashboard">View Details</a>
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
