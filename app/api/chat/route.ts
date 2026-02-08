import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@/lib/supabase/server"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit"
import { sanitizeInput, isValidMessageContent, logSecurityEvent } from "@/lib/security"

export const maxDuration = 30

// Initialize Google AI with environment variable
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set")
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

// Mental health specialized system prompt
const MENTAL_HEALTH_SYSTEM_PROMPT = `
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

    // Get conversation history for context
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("role, content, emotion_detected")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20) // Last 20 messages for context

    if (messagesError) {
      console.error("Error fetching messages:", messagesError)
    }

    // Build conversation history
    let conversationHistory = MENTAL_HEALTH_SYSTEM_PROMPT + "\n\n"

    // Add previous messages for context
    if (messages) {
      messages.forEach((msg) => {
        conversationHistory += `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n`
      })
    }

    // Enhanced prompt for emotion detection and mental health support
    const enhancedPrompt = `
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

User: ${message}  
Assistant:


    User message: "${message}"
    Message type: ${messageType}
    


    
    User: ${message}
    Assistant: `

    conversationHistory += enhancedPrompt

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

    // Save the conversation to database
    const { error: saveError } = await supabase.from("messages").insert([
      {
        conversation_id: conversationId,
        role: "user",
        content: message,
        message_type: messageType,
        emotion_detected: detectedEmotion,
      },
      {
        conversation_id: conversationId,
        role: "assistant",
        content: fullResponse,
        message_type: "text",
        emotion_detected: "supportive",
      },
    ])

    if (saveError) {
      console.error("Error saving messages:", saveError)
    }

    return Response.json({
      content: fullResponse,
      emotion_detected: detectedEmotion,
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

// Enhanced emotion detection function
function detectEmotion(userMessage: string, aiResponse: string): string {
  const message = userMessage.toLowerCase()

  // Crisis indicators (highest priority)
  const crisisKeywords = ["suicide", "kill myself", "end it all", "want to die", "no point living"]
  if (crisisKeywords.some((keyword) => message.includes(keyword))) {
    return "crisis"
  }

  // Anxiety indicators
  const anxietyKeywords = ["anxious", "worried", "panic", "nervous", "scared", "fear", "overwhelmed", "stress"]
  if (anxietyKeywords.some((keyword) => message.includes(keyword))) {
    return "anxiety"
  }

  // Depression indicators
  const depressionKeywords = ["depressed", "sad", "hopeless", "empty", "worthless", "tired", "exhausted", "lonely"]
  if (depressionKeywords.some((keyword) => message.includes(keyword))) {
    return "depression"
  }

  // Anger indicators
  const angerKeywords = ["angry", "furious", "mad", "frustrated", "irritated", "rage", "hate"]
  if (angerKeywords.some((keyword) => message.includes(keyword))) {
    return "anger"
  }

  // Joy/positive indicators
  const joyKeywords = ["happy", "excited", "great", "wonderful", "amazing", "joy", "grateful", "thankful"]
  if (joyKeywords.some((keyword) => message.includes(keyword))) {
    return "joy"
  }

  // Stress indicators
  const stressKeywords = ["stressed", "pressure", "burden", "overwhelmed", "too much", "can't handle"]
  if (stressKeywords.some((keyword) => message.includes(keyword))) {
    return "stress"
  }

  // Confusion indicators
  const confusionKeywords = ["confused", "don't know", "uncertain", "lost", "don't understand"]
  if (confusionKeywords.some((keyword) => message.includes(keyword))) {
    return "confusion"
  }

  return "neutral"
}
