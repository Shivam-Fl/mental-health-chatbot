import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { analyzeEmotion } from "@/lib/mental-health-prompts"

// Simple in-memory cache to prevent duplicate API calls
const requestCache = new Map<string, { response: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds
const MAX_REQUESTS_PER_MINUTE = 10 // Limit requests per minute
const requestCounts = new Map<string, { count: number; resetTime: number }>()

interface VideoChatRequest {
  transcript?: string
  emotion?: string
  confidence?: number
  conversationId: string
  visualAnalysis?: any
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, emotion, confidence, conversationId, visualAnalysis }: VideoChatRequest = await req.json()

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID is required" }, { status: 400 })
    }

    // Rate limiting check
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const now = Date.now()
    const userRequests = requestCounts.get(clientIP)
    
    if (userRequests) {
      if (now > userRequests.resetTime) {
        // Reset counter
        requestCounts.set(clientIP, { count: 1, resetTime: now + 60000 })
      } else if (userRequests.count >= MAX_REQUESTS_PER_MINUTE) {
        return NextResponse.json({ 
          error: "Too many requests. Please wait before trying again.",
          retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
        }, { status: 429 })
      } else {
        userRequests.count++
      }
    } else {
      requestCounts.set(clientIP, { count: 1, resetTime: now + 60000 })
    }

    // Early return if no meaningful content
    if (!transcript || transcript.trim().length === 0) {
      console.log("No transcript provided, returning simple response")
      return NextResponse.json({
        response: "I can see you're here. Feel free to speak when you're ready, or just know that I'm here to listen and support you.",
        emotion_detected: "neutral",
        visual_analysis: visualAnalysis,
        audio_emotion: emotion || "neutral",
        confidence: confidence || 0,
      })
    }

    // Check cache first
    const cacheKey = `${transcript}-${emotion || 'neutral'}-${confidence || 0}`
    const cached = requestCache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log("Returning cached response")
      return NextResponse.json(cached.response)
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify conversation belongs to user and get previous messages for context
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Get recent conversation history for context
    const { data: recentMessages } = await supabase
      .from("messages")
      .select("role, content, emotion_detected")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10)

    // Build conversation context
    let conversationContext = ""
    if (recentMessages && recentMessages.length > 0) {
      conversationContext = "\n\nRecent conversation history:\n"
      // Reverse to show chronological order
      recentMessages.reverse().forEach(msg => {
        const emotionTag = msg.emotion_detected && msg.emotion_detected !== 'neutral'
          ? ` [${msg.emotion_detected}]`
          : ""
        conversationContext += `${msg.role === "user" ? "User" : "Assistant"}${emotionTag}: ${msg.content}\n`
      })
      conversationContext += "\n---\n"
    }

    // Analyze emotion from both audio and video
    let detectedEmotion = "neutral"
    let emotionConfidence = 0.5

    if (emotion && confidence) {
      detectedEmotion = emotion
      emotionConfidence = confidence
    }

    // Create enhanced context with visual analysis
    const visualContext = visualAnalysis ? `
Visual Analysis:
- Emotion: ${visualAnalysis.emotion || 'neutral'}
- Confidence: ${Math.round((visualAnalysis.confidence || 0) * 100)}%
- Facial Features: ${JSON.stringify(visualAnalysis.facial_features || {})}
- Overall Expression: ${visualAnalysis.overall_expression || 'neutral'}
` : ""

    const context = `
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


User is in a video call session with both audio and video input.
${visualContext}
Detected emotion: ${detectedEmotion} (confidence: ${Math.round(emotionConfidence * 100)}%)
${transcript ? `User said: "${transcript}"` : "User is silent but visible"}
`

    // Generate AI response with enhanced emotion analysis
    const aiResponse = await analyzeEmotion({
      message: transcript,
      emotion: detectedEmotion,
      confidence: emotionConfidence,
      context: context,
      isVideoCall: true,
      visualAnalysis: visualAnalysis
    })

    // Save user message if there's a transcript
    if (transcript && transcript.trim()) {
      const { error: userMsgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: transcript,
          message_type: "video",
          emotion_detected: detectedEmotion,
        })

      if (userMsgError) {
        console.error("Error saving user message:", userMsgError)
      }
    }

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "assistant",
        content: aiResponse.content,
        message_type: "text",
        emotion_detected: aiResponse.emotion_detected,
      })

    if (aiMsgError) {
      console.error("Error saving AI message:", aiMsgError)
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)

    const response = {
      response: aiResponse.content,
      emotion_detected: aiResponse.emotion_detected,
      visual_analysis: visualAnalysis,
      audio_emotion: detectedEmotion,
      confidence: emotionConfidence,
    }

    // Cache the response
    requestCache.set(cacheKey, { response, timestamp: now })
    
    // Clean up old cache entries
    if (requestCache.size > 100) {
      const entries = Array.from(requestCache.entries())
      const cutoff = now - CACHE_DURATION
      entries.forEach(([key, value]) => {
        if (value.timestamp < cutoff) {
          requestCache.delete(key)
        }
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error("Video chat API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


