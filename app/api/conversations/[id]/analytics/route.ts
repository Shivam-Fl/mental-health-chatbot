import { generateContent, getModelName } from "@/lib/gemini"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// ─── Types ──────────────────────────────────────────────────────────────────

interface AIAnalysisResult {
  topicAnalysis: Array<{ topic: string; frequency: number; sentiment: number }>
  progressMetrics: { copingStrategiesDiscussed: number; insightsGained: number; actionItemsIdentified: number }
  overallSentiment: number
}

// ─── AI batch analysis of the full conversation ──────────────────────────────

async function analyzeConversationWithAI(messages: any[]): Promise<AIAnalysisResult | null> {
  if (!process.env.VERTEX_AI_API_KEY || messages.length === 0) return null

  try {
    // Build a condensed conversation transcript (last 40 messages, 300 chars each)
    // messages is already filtered to exclude emotion_event rows (handled by the caller)
    const transcript = messages
      .filter((m: any) => m.content && m.content.trim())
      .slice(-40)
      .map((m: any) => `${m.role === "user" ? "User" : "Aura"}: ${String(m.content || "").substring(0, 300)}`)
      .join("\n")

    const prompt = `You are analyzing a therapy conversation. Return ONLY a valid JSON object — no markdown, no explanation.

CONVERSATION:
${transcript}

Return this exact JSON shape:
{
  "topicAnalysis": [
    {"topic": "<topic name>", "frequency": <integer>, "sentiment": <0.0-1.0>}
  ],
  "progressMetrics": {
    "copingStrategiesDiscussed": <integer>,
    "insightsGained": <integer>,
    "actionItemsIdentified": <integer>
  },
  "overallSentiment": <-1.0 to 1.0>
}

Rules:
- topicAnalysis: identify up to 6 distinct themes discussed (e.g. "Anxiety", "Work Stress", "Relationships", "Self-esteem", "Sleep Issues", "Family").  Only include topics that were genuinely discussed. frequency = approximate mention count. sentiment: 0.0=very negative discussion, 0.5=neutral, 1.0=positive/resolved.
- progressMetrics: count concrete coping strategies mentioned, genuine insights/realizations the user expressed, and explicit action plans the user stated.
- overallSentiment: overall emotional tone of the whole conversation (-1=very negative, 0=neutral, +1=very positive).`

    const text = await generateContent(getModelName(), {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
    })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    const parsed = JSON.parse(jsonMatch[0])

    return {
      topicAnalysis: (parsed.topicAnalysis || []).filter(
        (t: any) => t.topic && typeof t.frequency === "number"
      ),
      progressMetrics: {
        copingStrategiesDiscussed: parseInt(parsed.progressMetrics?.copingStrategiesDiscussed) || 0,
        insightsGained: parseInt(parsed.progressMetrics?.insightsGained) || 0,
        actionItemsIdentified: parseInt(parsed.progressMetrics?.actionItemsIdentified) || 0,
      },
      overallSentiment: Math.min(1, Math.max(-1, parseFloat(parsed.overallSentiment) || 0)),
    }
  } catch (err) {
    console.error("AI conversation analysis error:", err)
    return null
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

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
      .select(`*, messages(*)`)
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (convError) throw convError

    const allMessages: any[] = conversation.messages || []
    // Separate realtime emotion-event rows from real conversation messages
    const isEmotionEventRow = (m: any) => m.content === "__emotion_event__"
    const messages = allMessages.filter((m) => !isEmotionEventRow(m))
    const emotionEventRows = allMessages.filter(isEmotionEventRow)

    // ── Basic metrics ──────────────────────────────────────────────────────

    const totalMessages = messages.length

    let sessionDuration = 1
    if (messages.length >= 2) {
      const sorted = [...messages].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const first = new Date(sorted[0].created_at).getTime()
      const last = new Date(sorted[sorted.length - 1].created_at).getTime()
      sessionDuration = Math.max(1, Math.round((last - first) / (1000 * 60)))
    }

    // ── Session type breakdown ─────────────────────────────────────────────

    const sessionTypes = messages.reduce(
      (acc: { text: number; audio: number; video: number }, m: any) => {
        const t = m.message_type as string
        if (t === "audio") acc.audio++
        else if (t === "video") acc.video++
        else acc.text++
        return acc
      },
      { text: 0, audio: 0, video: 0 }
    )

    // ── Emotion trends — include real messages + realtime video emotion rows ──
    // Realtime video emotion rows are identified by content === "__emotion_event__"

    const combinedMessages = [...messages, ...emotionEventRows]

    const emotionTrends = combinedMessages
      .filter((m: any) => m.emotion_detected && m.emotion_detected !== "neutral")
      .map((m: any) => ({
        timestamp: m.created_at,
        emotion: m.emotion_detected as string,
        confidence: 0.75,
        source: isEmotionEventRow(m)
          ? "video"
          : (m.message_type as string) || "text",
      }))
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // ── Emotion distribution counts — include realtime video events ───────

    const emotionDistribution: Record<string, number> = {}
    combinedMessages.forEach((m: any) => {
      const e = m.emotion_detected
      if (e) emotionDistribution[e] = (emotionDistribution[e] || 0) + 1
    })

    // ── AI-powered topic + sentiment analysis ─────────────────────────────

    const aiAnalysis = await analyzeConversationWithAI(messages)

    // Fallback topic analysis (keyword-based) if AI fails
    const fallbackTopics = [
      { topic: "Anxiety", keywords: ["anxious", "worry", "nervous", "panic"] },
      { topic: "Depression", keywords: ["sad", "depressed", "hopeless", "empty"] },
      { topic: "Relationships", keywords: ["family", "friend", "partner", "relationship"] },
      { topic: "Work / Career", keywords: ["work", "job", "career", "boss"] },
      { topic: "Self-esteem", keywords: ["confidence", "self-worth", "insecure", "doubt"] },
      { topic: "Coping", keywords: ["cope", "manage", "handle", "strategy"] },
    ]
    const fallbackTopicAnalysis = fallbackTopics
      .map(({ topic, keywords }) => {
        const text = messages.map((m: any) => String(m.content || "").toLowerCase()).join(" ")
        const frequency = keywords.reduce(
          (n, kw) => n + (text.split(kw).length - 1),
          0
        )
        return { topic, frequency, sentiment: 0.5 }
      })
      .filter((t) => t.frequency > 0)

    const topicAnalysis = aiAnalysis?.topicAnalysis.length
      ? aiAnalysis.topicAnalysis
      : fallbackTopicAnalysis

    const progressMetrics = aiAnalysis?.progressMetrics || {
      copingStrategiesDiscussed: 0,
      insightsGained: 0,
      actionItemsIdentified: 0,
    }

    const overallSentiment = aiAnalysis?.overallSentiment ?? 0

    // ── Assemble response ─────────────────────────────────────────────────

    const analytics = {
      totalMessages,
      sessionDuration,
      sessionTypes,
      emotionTrends,
      emotionDistribution,
      topicAnalysis,
      progressMetrics,
      overallSentiment,
    }

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 })
  }
}

