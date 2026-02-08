import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id: conversationId } = await params

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get conversation with messages
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        messages(*)
      `)
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (convError) throw convError

    // Calculate analytics
    const messages = conversation.messages || []

    // Basic metrics
    const totalMessages = messages.length
    const sessionStart = new Date(conversation.created_at)
    const sessionEnd = new Date(conversation.updated_at)
    const sessionDuration = Math.max(1, Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60))) // minutes, at least 1

    // Emotion trends from messages' emotion_detected field
    const emotionTrends = messages
      .filter((m: any) => m.emotion_detected && m.emotion_detected !== "neutral")
      .map((m: any) => ({
        timestamp: m.created_at,
        emotion: m.emotion_detected,
        confidence: 0.8, // Default confidence for text-based detection
      }))
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Topic analysis (simplified - in production you'd use NLP)
    const topicKeywords = [
      { topic: "Anxiety", keywords: ["anxious", "worry", "nervous", "stress", "panic"] },
      { topic: "Depression", keywords: ["sad", "depressed", "hopeless", "empty", "down"] },
      { topic: "Relationships", keywords: ["family", "friend", "partner", "relationship", "social"] },
      { topic: "Work/Career", keywords: ["work", "job", "career", "boss", "colleague"] },
      { topic: "Self-esteem", keywords: ["confidence", "self-worth", "insecure", "doubt"] },
      { topic: "Coping", keywords: ["cope", "manage", "handle", "deal", "strategy"] },
    ]

    const topicAnalysis = topicKeywords
      .map(({ topic, keywords }) => {
        const messageText = messages.map((m: any) => m.content.toLowerCase()).join(" ")
        const frequency = keywords.reduce((count, keyword) => {
          const matches = (messageText.match(new RegExp(keyword, "g")) || []).length
          return count + matches
        }, 0)

        // Simple sentiment analysis based on message emotions
        const relatedMessages = messages.filter((m: any) =>
          m.emotion_detected && keywords.some((keyword) => m.content?.toLowerCase().includes(keyword)),
        )
        const positiveEmotions = ["joy", "supportive", "neutral"]
        const avgSentiment =
          relatedMessages.length > 0
            ? relatedMessages.reduce((sum: number, m: any) => sum + (positiveEmotions.includes(m.emotion_detected) ? 0.8 : 0.3), 0) / relatedMessages.length
            : 0.5

        return {
          topic,
          frequency,
          sentiment: avgSentiment,
        }
      })
      .filter((t) => t.frequency > 0)

    // Progress metrics (simplified)
    const progressMetrics = {
      copingStrategiesDiscussed: messages.filter(
        (m: any) =>
          m.content.toLowerCase().includes("strategy") ||
          m.content.toLowerCase().includes("cope") ||
          m.content.toLowerCase().includes("technique"),
      ).length,
      insightsGained: messages.filter(
        (m: any) =>
          m.content.toLowerCase().includes("realize") ||
          m.content.toLowerCase().includes("understand") ||
          m.content.toLowerCase().includes("insight"),
      ).length,
      actionItemsIdentified: messages.filter(
        (m: any) =>
          m.content.toLowerCase().includes("will try") ||
          m.content.toLowerCase().includes("plan to") ||
          m.content.toLowerCase().includes("going to"),
      ).length,
    }

    const analytics = {
      totalMessages,
      sessionDuration,
      emotionTrends,
      topicAnalysis,
      progressMetrics,
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 })
  }
}
