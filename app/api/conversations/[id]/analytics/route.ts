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

    // Calculate session duration from actual message timestamps
    let sessionDuration = 1 // minimum 1 minute
    if (messages.length >= 2) {
      const sortedMessages = [...messages].sort(
        (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const firstMessageTime = new Date(sortedMessages[0].created_at).getTime()
      const lastMessageTime = new Date(sortedMessages[sortedMessages.length - 1].created_at).getTime()
      sessionDuration = Math.max(1, Math.round((lastMessageTime - firstMessageTime) / (1000 * 60)))
    }

    // Emotion trends from messages' emotion_detected field with real confidence
    const emotionTrends = messages
      .filter((m: any) => m.emotion_detected && m.emotion_detected !== "neutral")
      .map((m: any) => ({
        timestamp: m.created_at,
        emotion: m.emotion_detected,
        confidence: calculateEmotionConfidence(m.content, m.emotion_detected),
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

// Calculate real confidence score based on keyword density in the message
// Confidence ranges from 0.4 (weak match) to 0.95 (strong match)
const WORDS_PER_KEYWORD_GROUP = 10 // Expected words per keyword match for density calculation

function calculateEmotionConfidence(content: string, emotion: string): number {
  if (!content || !emotion) return 0.5

  const text = content.toLowerCase()

  const emotionKeywords: Record<string, string[]> = {
    crisis: ["suicide", "suicidal", "kill myself", "end it all", "want to die", "self-harm", "hurt myself"],
    anxiety: ["anxious", "anxiety", "worried", "worry", "panic", "nervous", "scared", "overwhelmed", "restless", "tense"],
    depression: ["depressed", "depression", "sad", "hopeless", "empty", "worthless", "numb", "exhausted", "lonely"],
    stress: ["stressed", "stress", "pressure", "burden", "overwhelmed", "burnt out", "burnout", "too much"],
    anger: ["angry", "anger", "furious", "mad", "frustrated", "irritated", "rage", "hate", "pissed"],
    joy: ["happy", "excited", "great", "wonderful", "amazing", "grateful", "thankful", "blessed", "relieved"],
    fear: ["afraid", "fear", "terrified", "scared", "frightened", "dread", "phobia"],
    sadness: ["sad", "crying", "tears", "grief", "loss", "mourning", "heartbroken"],
    confusion: ["confused", "uncertain", "unsure", "lost", "puzzled", "bewildered"],
    surprise: ["surprised", "shocked", "unexpected", "amazed", "astonished"],
    disgust: ["disgusted", "disgusting", "repulsed", "revolting"],
  }

  const keywords = emotionKeywords[emotion] || []
  // Safe: early return before any division involving keywords.length
  if (keywords.length === 0) return 0.5

  const matchCount = keywords.filter(keyword => text.includes(keyword)).length
  const wordCount = text.split(/\s+/).length

  // Base confidence from keyword matches (0.4 to 0.95)
  const keywordRatio = matchCount / keywords.length
  const densityRatio = Math.min(matchCount / Math.max(wordCount / WORDS_PER_KEYWORD_GROUP, 1), 1)

  // Combine keyword match ratio and density for confidence
  const confidence = 0.4 + (keywordRatio * 0.35) + (densityRatio * 0.2)

  return Math.min(Math.round(confidence * 100) / 100, 0.95)
}
