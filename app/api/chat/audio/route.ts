import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { PSYCHIATRIST_SYSTEM_PROMPT, VOICE_SESSION_NOTE, analyzeMessageEmotion } from "@/lib/mental-health-prompts"

export const maxDuration = 30

// Helper function to get Google AI instance with runtime validation
function getGoogleAI() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set")
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
}

interface AudioChatRequest {
  transcript: string
  audioData?: string | null
  conversationId?: string
  faceEmotion?: { emotion: string; confidence: number; visualAnalysis?: any } | null
  hasVideo?: boolean
}

export async function POST(req: Request) {
  try {
    const { transcript, audioData, conversationId, faceEmotion, hasVideo }: AudioChatRequest = await req.json()

    console.log("[DEBUG] Audio API received:", { 
      transcript: transcript?.substring(0, 50) + "...", 
      hasAudio: !!audioData, 
      conversationId, 
      faceEmotion, 
      hasVideo 
    })

    if (!transcript?.trim()) {
      return Response.json({ error: "No transcript provided" }, { status: 400 })
    }

    const supabase = await createClient()

    // Get user for conversation context
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create conversation for audio session
    let currentConversationId = conversationId

    if (!currentConversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: "Audio Session",
        })
        .select()
        .single()

      if (convError) throw convError
      currentConversationId = newConversation.id
    }

    // Get recent conversation context (last 5 messages for audio)
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("role, content, emotion_detected")
      .eq("conversation_id", currentConversationId)
      .order("created_at", { ascending: true })
      .limit(5)

    // Use the canonical psychiatrist prompt for all audio modes
    let conversationHistory = PSYCHIATRIST_SYSTEM_PROMPT + VOICE_SESSION_NOTE

    // Add recent context
    if (recentMessages) {
      recentMessages.forEach((msg) => {
        conversationHistory += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`
      })
    }

    // Add current interaction with face emotion if available
    let currentInput = `User: [AUDIO] ${transcript}`
    if (hasVideo && faceEmotion) {
      currentInput += `\n[VISUAL] Face emotion detected: ${faceEmotion.emotion} (${Math.round(faceEmotion.confidence * 100)}% confidence)`
    }
    currentInput += `\nAssistant: `
    
    conversationHistory += currentInput

    const genAI = getGoogleAI()
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    // Run AI response generation and emotion detection in parallel
    const [result, emotionResult] = await Promise.all([
      model.generateContentStream({
        contents: [{ role: "user", parts: [{ text: conversationHistory }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 400,
        },
      }),
      analyzeMessageEmotion(transcript),
    ])

    let fullResponse = ""
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      fullResponse += chunkText
    }

    // Use face emotion if available and high-confidence, otherwise use AI text emotion
    const aiTextEmotion = emotionResult.emotion
    const finalEmotion = (faceEmotion && faceEmotion.confidence > 0.6) ? faceEmotion.emotion : aiTextEmotion

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role: "user",
      content: transcript,
      message_type: hasVideo ? "video" : "audio",
      emotion_detected: finalEmotion,
    })

    // Save AI response
    await supabase.from("messages").insert({
      conversation_id: currentConversationId,
      role: "assistant",
      content: fullResponse,
      message_type: "text", // AI response is text that will be spoken
    })

    return Response.json({
      response: fullResponse,
      emotion_detected: finalEmotion,
      sentiment: emotionResult.sentiment,
      face_emotion: faceEmotion,
      has_video: hasVideo,
      conversation_id: currentConversationId,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Audio chat API error:", error)
    return Response.json(
      {
        response:
          "I'm sorry, I'm having trouble processing your audio right now. Let me know if you'd like to continue with text, and I'm here to support you.",
        error: "Audio processing failed",
      },
      { status: 500 },
    )
  }
}
