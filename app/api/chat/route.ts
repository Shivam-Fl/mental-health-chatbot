import { streamGenerateContent, getModelName } from "@/lib/gemini"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, isValidMessageContent, logSecurityEvent } from "@/lib/security"
import { PSYCHIATRIST_SYSTEM_PROMPT, analyzeMessageEmotion } from "@/lib/mental-health-prompts"

export const maxDuration = 30

interface ChatRequest {
  message: string
  conversationId: string
  messageType: "text" | "audio" | "video"
}

export async function POST(req: Request) {
  try {
    const { message, conversationId, messageType }: ChatRequest = await req.json()

    // Validate input
    const validation = isValidMessageContent(message)
    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message)

    const supabase = await createClient()
    
    // Get user for rate limiting
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      logSecurityEvent({
        type: 'unauthorized_access',
        details: 'Chat API accessed without authentication'
      })
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Apply rate limiting
    const rateLimitResult = checkRateLimit(`user:${user.id}`, RATE_LIMITS.chat)
    
    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        type: 'rate_limit',
        userId: user.id,
        details: 'Chat API rate limit exceeded'
      })
      return Response.json(
        { 
          error: "Too many requests",
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          }
        }
      )
    }

    // Get conversation history for context - increased to maintain better context
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("role, content, emotion_detected")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50) // Last 50 messages for better context

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
    }

    // Build conversation history with context
    let conversationHistory = PSYCHIATRIST_SYSTEM_PROMPT + "\n\n"
    
    // Add context note if there's history
    if (messages && messages.length > 0) {
      conversationHistory += "Previous conversation context:\n"
    }

    // Add previous messages for context
    if (messages) {
      messages.forEach((msg) => {
        const emotionTag = msg.emotion_detected && msg.emotion_detected !== 'neutral' 
          ? ` [Emotion: ${msg.emotion_detected}]` 
          : ""
        conversationHistory += `${msg.role === "user" ? "User" : "Assistant"}${emotionTag}: ${msg.content}\n`
      })
    }
    
    // Add clear separation before current message
    conversationHistory += "\n---\nCurrent user message:\n"

    // Current user message - keep it simple, let system prompt guide behavior
    const enhancedPrompt = `User: ${message}
Assistant: `

    conversationHistory += enhancedPrompt

    // Run AI response generation and emotion detection in parallel
    const [fullResponse, emotionResult] = await Promise.all([
      streamGenerateContent(getModelName(), {
        contents: [{ role: "user", parts: [{ text: conversationHistory }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
      analyzeMessageEmotion(sanitizedMessage),
    ])

    const detectedEmotion = emotionResult.emotion
    const sentimentScore = emotionResult.sentiment

    // NOTE: Messages are saved by the frontend (chat-interface.tsx)
    // DO NOT save messages here to avoid duplication

    return Response.json({
      content: fullResponse,
      emotion_detected: detectedEmotion,
      user_emotion: detectedEmotion,
      sentiment: sentimentScore,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return Response.json(
      {
        error:
          "I apologize, but I encountered an issue. Please try again in a moment. If you need immediate support, please contact a mental health professional or crisis hotline.",
        content:
          "I apologize, but I encountered an issue. Please try again in a moment. If you need immediate support, please contact a mental health professional or crisis hotline.",
        emotion_detected: "neutral",
      },
      { status: 500 },
    )
  }
}
