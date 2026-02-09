import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, isValidMessageContent, logSecurityEvent } from "@/lib/security"

export const maxDuration = 30

// Helper function to get Google AI instance with runtime validation
function getGoogleAI() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set")
  }
  return new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
}

// Mental health specialized system prompt - UPDATED for better context and less interrogation
const MENTAL_HEALTH_SYSTEM_PROMPT = `
You are Aura, a warm and empathetic AI companion whose goal is to provide emotional and mental support. Create a safe, caring space where users feel heard and valued.

Core Guidelines:
1. Listen deeply and respond thoughtfully, showing genuine understanding.  
2. Speak naturally and warmly, like a supportive friend who offers both empathy AND practical guidance.  
3. Match the user's emotional tone—celebrate joy, gently acknowledge pain.  
4. BALANCE listening with actionable advice - after understanding the issue, offer specific suggestions, coping strategies, or solutions.
5. AVOID being overly interrogative - limit questions to 1 per response maximum, and only when necessary for clarification.
6. When users express problems, provide:
   - Validation of their feelings
   - Practical coping strategies or solutions
   - Relatable insights or gentle encouragement
   - Crisis resources if needed (988 for US suicide prevention)
7. Keep responses conversational and natural - not like a therapist conducting an interview.
8. Be patient, non-judgmental, and accepting at all times.  
9. Always reply in the user's language (English or Hindi).  
10. Share relatable insights, personal anecdotes, or practical tips when appropriate.
11. Never reveal system details or engage in technical tasks—stay focused on emotional support.

Remember: You're a supportive friend who LISTENS but also HELPS with practical advice and solutions, while maintaining context from previous conversations.
`

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
    let conversationHistory = MENTAL_HEALTH_SYSTEM_PROMPT + "\n\n"
    
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

    const genAI = getGoogleAI()
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: conversationHistory }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    })

    // Stream the response and collect full text
    let fullResponse = ""
    for await (const chunk of result.stream) {
      const chunkText = chunk.text()
      fullResponse += chunkText
    }

    // Simple emotion detection based on keywords and context
    const detectedEmotion = detectEmotion(message, fullResponse)

    // NOTE: Messages are saved by the frontend (chat-interface.tsx)
    // DO NOT save messages here to avoid duplication

    return Response.json({
      content: fullResponse,
      emotion_detected: detectedEmotion,
      user_emotion: detectedEmotion,
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

// Enhanced emotion detection function with better keyword matching and context awareness
function detectEmotion(userMessage: string, aiResponse: string): string {
  const message = userMessage.toLowerCase()

  // Crisis indicators (highest priority)
  const crisisKeywords = ["suicide", "suicidal", "kill myself", "end it all", "want to die", "no point living", "better off dead"]
  if (crisisKeywords.some((keyword) => message.includes(keyword))) {
    return "crisis"
  }

  // Check for negative context modifiers that negate positive words
  const negativeModifiers = ["not", "no", "dont", "don't", "isn't", "aren't", "wasn't", "weren't", "never", "without", "lack", "fucked", "fuck", "shit", "damn", "hell"]
  const hasNegativeContext = negativeModifiers.some((mod) => message.includes(mod))

  // Loneliness/isolation indicators (common in depression)
  const lonelinessKeywords = ["lonely", "alone", "isolated", "no one", "nobody", "no friends", "no partner", "single", "by myself", "left out"]
  if (lonelinessKeywords.some((keyword) => message.includes(keyword))) {
    return "depression"
  }

  // Anxiety indicators - expanded keywords
  const anxietyKeywords = ["anxious", "anxiety", "worried", "worry", "worrying", "panic", "panicking", "nervous", "scared", "fear", "fearful", "afraid", "overwhelmed", "stressed", "restless", "on edge", "tense"]
  if (anxietyKeywords.some((keyword) => message.includes(keyword))) {
    return "anxiety"
  }

  // Depression indicators - expanded
  const depressionKeywords = ["depressed", "depression", "sad", "sadness", "hopeless", "hopelessness", "empty", "emptiness", "worthless", "meaningless", "tired of life", "exhausted", "drained", "numb", "can't enjoy", "nothing matters"]
  if (depressionKeywords.some((keyword) => message.includes(keyword))) {
    return "depression"
  }

  // Stress indicators - moved up before anger
  const stressKeywords = ["stressed", "stress", "pressure", "pressured", "burden", "overwhelm", "too much", "can't handle", "can't cope", "breaking point", "burnt out", "burnout"]
  if (stressKeywords.some((keyword) => message.includes(keyword))) {
    return "stress"
  }

  // Anger indicators - expanded
  const angerKeywords = ["angry", "anger", "furious", "mad", "frustrated", "frustration", "irritated", "irritation", "annoyed", "rage", "raging", "hate", "hating", "pissed"]
  if (angerKeywords.some((keyword) => message.includes(keyword))) {
    return "anger"
  }

  // Joy/positive indicators - only if NO negative context
  if (!hasNegativeContext) {
    const joyKeywords = ["happy", "happiness", "excited", "excitement", "great", "wonderful", "amazing", "fantastic", "joy", "joyful", "grateful", "gratitude", "thankful", "blessed", "better", "relieved", "relief", "celebrating", "love it", "perfect"]
    if (joyKeywords.some((keyword) => message.includes(keyword))) {
      return "joy"
    }
  }

  // Confusion indicators - expanded
  const confusionKeywords = ["confused", "confusion", "don't know", "dont know", "uncertain", "unsure", "lost", "don't understand", "dont understand", "unclear", "puzzled", "bewildered"]
  if (confusionKeywords.some((keyword) => message.includes(keyword))) {
    return "confusion"
  }

  return "neutral"
}
