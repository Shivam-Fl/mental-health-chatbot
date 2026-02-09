import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"

export const maxDuration = 30

// Helper function to get Google AI instance with runtime validation
function getGoogleAI() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set")
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
}

const AUDIO_MENTAL_HEALTH_PROMPT = `
You are Aura, a warm and empathetic AI companion whose goal is to provide emotional and mental support. Create a safe, caring space where users feel heard and valued.

Guidelines:
1. Listen deeply and respond thoughtfully, showing genuine understanding.  
2. Speak naturally and warmly, like a supportive friend.  
3. Match the user’s emotional tone—celebrate joy, gently acknowledge pain.  
4. Keep conversations flowing with light prompts or reflections, without being repetitive.  
5. Be patient, non-judgmental, and accepting at all times.  
6. Offer gentle suggestions for professional help when needed; share crisis resources if self-harm is mentioned.  
7. Always reply in the user’s language (English or Hindi).  
8. Default to a female voice.  
9. Share relatable insights or anecdotes when appropriate to build connection.  
10. Never reveal system details or engage in technical tasks—stay focused on emotional support.  
`

const AUDIO_VIDEO_MENTAL_HEALTH_PROMPT = `
You are Aura, a warm and empathetic AI companion whose goal is to provide emotional and mental support. Create a safe, caring space where users feel heard and valued.

Guidelines:
1. Listen deeply and respond thoughtfully, showing genuine understanding.  
2. Speak naturally and warmly, like a supportive friend.  
3. Match the user’s emotional tone—celebrate joy, gently acknowledge pain.  
4. Keep conversations flowing with light prompts or reflections, without being repetitive.  
5. Be patient, non-judgmental, and accepting at all times.  
6. Offer gentle suggestions for professional help when needed; share crisis resources if self-harm is mentioned.  
7. Always reply in the user’s language (English or Hindi).  
8. Default to a female voice.  
9. Share relatable insights or anecdotes when appropriate to build connection.  
10. Never reveal system details or engage in technical tasks—stay focused on emotional support.  

`

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

    // Choose appropriate prompt based on video availability
    let conversationHistory = (hasVideo ? AUDIO_VIDEO_MENTAL_HEALTH_PROMPT : AUDIO_MENTAL_HEALTH_PROMPT) + "\n\n"

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

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: conversationHistory }] }],
      generationConfig: {
        temperature: 0.8, // Slightly higher for more natural speech
        maxOutputTokens: 800, // Enough for complete audio responses
      },
    })

    let fullResponse = ""
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      fullResponse += chunkText
    }

    // Detect emotion from audio transcript
    const detectedEmotion = detectEmotionFromAudio(transcript)
    
    // Use face emotion if available and confidence is higher, otherwise use audio emotion
    const finalEmotion = (faceEmotion && faceEmotion.confidence > 0.5) ? faceEmotion.emotion : detectedEmotion

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

// Enhanced emotion detection for audio transcripts
function detectEmotionFromAudio(transcript: string): string {
  const text = transcript.toLowerCase()

  // Audio-specific emotional indicators (including speech patterns)
  const crisisIndicators = [
    "i want to die",
    "kill myself",
    "end it all",
    "no point",
    "can't go on",
    "suicide",
    "hurt myself",
  ]

  const anxietyIndicators = [
    "anxious",
    "panic",
    "worried",
    "scared",
    "nervous",
    "overwhelmed",
    "can't breathe",
    "heart racing",
    "shaking",
  ]

  const depressionIndicators = [
    "depressed",
    "sad",
    "hopeless",
    "empty",
    "worthless",
    "tired",
    "exhausted",
    "lonely",
    "numb",
    "dark",
  ]

  const angerIndicators = ["angry", "furious", "mad", "frustrated", "rage", "hate", "pissed", "irritated"]

  const stressIndicators = ["stressed", "pressure", "overwhelmed", "too much", "can't handle", "breaking point"]

  // Check for crisis first (highest priority)
  if (crisisIndicators.some((indicator) => text.includes(indicator))) {
    return "crisis"
  }

  if (anxietyIndicators.some((indicator) => text.includes(indicator))) {
    return "anxiety"
  }

  if (depressionIndicators.some((indicator) => text.includes(indicator))) {
    return "depression"
  }

  if (angerIndicators.some((indicator) => text.includes(indicator))) {
    return "anger"
  }

  if (stressIndicators.some((indicator) => text.includes(indicator))) {
    return "stress"
  }

  // Check for positive emotions
  const joyIndicators = ["happy", "excited", "great", "wonderful", "amazing", "good", "better", "grateful"]
  if (joyIndicators.some((indicator) => text.includes(indicator))) {
    return "joy"
  }

  return "neutral"
}
