import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

interface EmotionEvent {
  emotion: string
  confidence: number
  timestamp: string
}

/**
 * POST /api/conversations/:id/emotion-events
 *
 * Batch-inserts realtime face-emotion readings from the video call as lightweight
 * "emotion_event" rows in the messages table. The analytics route already reads
 * all messages, so these automatically appear in emotion trends tagged with
 * source: "video". Chat-messages.tsx filters them out from the chat display.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const body = await request.json()
    const events: EmotionEvent[] = Array.isArray(body?.events) ? body.events : []

    if (events.length === 0) {
      return NextResponse.json({ ok: true, saved: 0 })
    }

    // Verify the conversation belongs to this user
    const { data: conv } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Deduplicate: only keep events where the emotion changed
    const deduped: EmotionEvent[] = []
    let lastEmotion = ""
    for (const ev of events) {
      if (ev.emotion && ev.emotion !== "neutral" && ev.emotion !== lastEmotion) {
        deduped.push(ev)
        lastEmotion = ev.emotion
      }
    }

    if (deduped.length === 0) {
      return NextResponse.json({ ok: true, saved: 0 })
    }

    // Insert as lightweight rows that the analytics route can read.
    // We use message_type 'video' (within the existing DB CHECK constraint) and a
    // distinctive content marker so chat-display can filter them out without any
    // schema migration.  The content marker is stripped in the analytics AI transcript
    // filter and in the chat-messages visibility filter.
    const rows = deduped.map((ev) => ({
      conversation_id: conversationId,
      role: "assistant",
      content: "__emotion_event__",
      message_type: "video",
      emotion_detected: ev.emotion,
      created_at: ev.timestamp,
    }))

    const { error: insertError } = await supabase.from("messages").insert(rows)
    if (insertError) throw insertError

    return NextResponse.json({ ok: true, saved: deduped.length })
  } catch (err) {
    console.error("Emotion events error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
