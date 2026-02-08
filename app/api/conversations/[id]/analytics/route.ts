import { createServerClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const conversationId = params.id

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get conversation with messages and emotion analyses
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select(`
        *,
        messages(*),
        emotion_analyses(*)
      `)
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (convError) throw convError

    // Calculate analytics
    const messages = conversation.messages || []
    const emotions = conversation.emotion_analyses || []

    // Basic metrics
    const totalMessages = messages.length
    const sessionStart = new Date(conversation.created_at)
    const sessionEnd = new Date(conversation.updated_at)
    const sessionDuration = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60)) // minutes

    // Emotion trends over time
    const emotionTrends = emotions
      .map((emotion) => ({
        timestamp: emotion.created_at,
        emotion: emotion.primary_emotion,
        confidence: emotion.confidence_score,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

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
        const messageText = messages.map((m) => m.content.toLowerCase()).join(" ")
        const frequency = keywords.reduce((count, keyword) => {
          const matches = (messageText.match(new RegExp(keyword, "g")) || []).length
          return count + matches
        }, 0)

        // Simple sentiment analysis based on emotion data
        const relatedEmotions = emotions.filter((e) =>
          keywords.some((keyword) => e.context?.toLowerCase().includes(keyword)),
        )
        const avgSentiment =
          relatedEmotions.length > 0
            ? relatedEmotions.reduce((sum, e) => sum + (e.confidence_score || 0.5), 0) / relatedEmotions.length
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
        (m) =>
          m.content.toLowerCase().includes("strategy") ||
          m.content.toLowerCase().includes("cope") ||
          m.content.toLowerCase().includes("technique"),
      ).length,
      insightsGained: messages.filter(
        (m) =>
          m.content.toLowerCase().includes("realize") ||
          m.content.toLowerCase().includes("understand") ||
          m.content.toLowerCase().includes("insight"),
      ).length,
      actionItemsIdentified: messages.filter(
        (m) =>
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
