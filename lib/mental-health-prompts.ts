// Specialized mental health prompts and coping strategies

export const CRISIS_RESOURCES = {
  us: {
    suicide: "988 Suicide & Crisis Lifeline",
    text: "Text HOME to 741741 for Crisis Text Line",
    emergency: "911 for immediate emergency",
  },
  international: {
    suicide: "International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/",
    emergency: "Contact your local emergency services",
  },
}

export const COPING_STRATEGIES = {
  anxiety: [
    "Try the 5-4-3-2-1 grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste",
    "Practice deep breathing: Breathe in for 4 counts, hold for 4, breathe out for 6",
    "Progressive muscle relaxation: Tense and release each muscle group starting from your toes",
    'Challenge anxious thoughts: Ask yourself "Is this thought realistic? What evidence do I have?"',
  ],
  depression: [
    "Start with small, achievable goals for the day",
    "Try to get some sunlight and fresh air, even if just for a few minutes",
    "Reach out to a trusted friend or family member",
    "Practice self-compassion: Treat yourself with the same kindness you'd show a good friend",
  ],
  stress: [
    "Break large tasks into smaller, manageable steps",
    'Practice saying "no" to additional commitments when overwhelmed',
    "Try a brief mindfulness meditation or body scan",
    "Schedule regular breaks and self-care activities",
  ],
  anger: [
    "Take a timeout: Step away from the situation for a few minutes",
    'Use "I" statements to express your feelings without blaming',
    "Try physical exercise to release tension",
    "Practice the STOP technique: Stop, Take a breath, Observe your feelings, Proceed mindfully",
  ],
}

export const MINDFULNESS_EXERCISES = [
  {
    name: "Box Breathing",
    description: "Breathe in for 4, hold for 4, breathe out for 4, hold for 4. Repeat 4-6 times.",
    duration: "2-3 minutes",
  },
  {
    name: "Body Scan",
    description:
      "Starting from your toes, slowly focus on each part of your body, noticing any sensations without judgment.",
    duration: "5-10 minutes",
  },
  {
    name: "Loving-Kindness Meditation",
    description:
      "Send kind thoughts to yourself, then to loved ones, then to neutral people, and finally to difficult people.",
    duration: "5-15 minutes",
  },
  {
    name: "Mindful Observation",
    description: "Choose an object and observe it closely for 2-3 minutes, noticing colors, textures, and details.",
    duration: "2-3 minutes",
  },
]

export const THERAPEUTIC_RESPONSES = {
  validation: [
    "I hear you, and what you're feeling is completely valid.",
    "It takes courage to share these feelings. Thank you for trusting me.",
    "Your emotions are important and deserve to be acknowledged.",
    "It's understandable that you're feeling this way given what you're going through.",
  ],
  empathy: [
    "That sounds really difficult. I'm here to support you through this.",
    "I can sense how much pain you're in right now.",
    "It's clear that you're going through a challenging time.",
    "Your feelings matter, and I want you to know you're not alone.",
  ],
  encouragement: [
    "You've shown incredible strength by reaching out today.",
    "Taking this step to talk about your feelings shows real courage.",
    "You're doing the best you can with the resources you have right now.",
    "Every small step forward is progress worth celebrating.",
  ],
}

export function getCopingStrategy(emotion: string): string[] {
  return COPING_STRATEGIES[emotion as keyof typeof COPING_STRATEGIES] || []
}

export function getRandomMindfulnessExercise() {
  return MINDFULNESS_EXERCISES[Math.floor(Math.random() * MINDFULNESS_EXERCISES.length)]
}

export function getTherapeuticResponse(type: "validation" | "empathy" | "encouragement"): string {
  const responses = THERAPEUTIC_RESPONSES[type]
  return responses[Math.floor(Math.random() * responses.length)]
}

// Enhanced emotion analysis function for AI responses
export async function analyzeEmotion({
  message,
  emotion,
  confidence,
  context,
  isVideoCall = false,
  visualAnalysis
}: {
  message: string
  emotion: string
  confidence: number
  context: string
  isVideoCall?: boolean
  visualAnalysis?: any
}): Promise<{ content: string; emotion_detected: string }> {
  // Import GoogleGenerativeAI dynamically to avoid issues
  const { GoogleGenerativeAI } = await import("@google/generative-ai")
  
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY environment variable is not set")
  }
  
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  // Enhanced prompt based on emotion and context
  let emotionGuidance = ""
  
  if (emotion === "crisis") {
    emotionGuidance = `
CRISIS DETECTED: This person may be in immediate danger. 
- Provide immediate emotional support and validation
- Offer crisis resources: "If you're having thoughts of self-harm, please reach out to the National Suicide Prevention Lifeline at 988 (US) or your local crisis center"
- Be gentle, non-judgmental, and encouraging
- Focus on immediate safety and hope
`
  } else if (emotion === "anxiety") {
    emotionGuidance = `
ANXIETY DETECTED: This person is experiencing anxiety.
- Provide calming, grounding responses
- Suggest breathing exercises or grounding techniques
- Validate their feelings while offering practical coping strategies
- Keep responses gentle and reassuring
`
  } else if (emotion === "depression") {
    emotionGuidance = `
DEPRESSION DETECTED: This person may be experiencing depression.
- Be extra gentle and validating
- Offer hope and small, achievable suggestions
- Encourage professional help if appropriate
- Focus on their strength and worth
`
  } else if (emotion === "anger") {
    emotionGuidance = `
ANGER DETECTED: This person is experiencing anger or frustration.
- Acknowledge their feelings without judgment
- Help them process the emotion safely
- Suggest healthy ways to express anger
- Be patient and understanding
`
  } else if (emotion === "joy") {
    emotionGuidance = `
JOY DETECTED: This person is experiencing positive emotions.
- Celebrate with them authentically
- Build on their positive energy
- Encourage them to savor the moment
- Be genuinely happy for them
`
  } else if (emotion === "stress") {
    emotionGuidance = `
STRESS DETECTED: This person is under stress.
- Offer practical stress management techniques
- Help them break down overwhelming situations
- Suggest self-care activities
- Be supportive and understanding
`
  }

  const visualContext = visualAnalysis ? `
Visual Analysis Context:
- Detected emotion: ${visualAnalysis.emotion || 'neutral'}
- Confidence: ${Math.round((visualAnalysis.confidence || 0) * 100)}%
- Facial features: ${JSON.stringify(visualAnalysis.facial_features || {})}
- Mental health indicators: ${JSON.stringify(visualAnalysis.mental_health_indicators || [])}
` : ""

  const fullPrompt = `${context}

${emotionGuidance}

${visualContext}

Current detected emotion: ${emotion} (confidence: ${Math.round(confidence * 100)}%)
User message: "${message}"

Please respond as Aura, providing an empathetic and helpful response that:
1. Acknowledges their emotional state appropriately
2. Provides relevant support or guidance
3. Maintains a warm, caring tone
4. Offers practical help when appropriate
5. Keeps the conversation flowing naturally

${isVideoCall ? "Remember: This is a video call, so respond as if you can see them and are having a face-to-face conversation." : ""}`

  try {
    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const content = response.text()

    // Determine the emotion detected in the AI's response
    const aiEmotionDetected = detectEmotionInResponse(content)

    return {
      content: content.trim(),
      emotion_detected: aiEmotionDetected
    }
  } catch (error) {
    console.error("Error generating AI response:", error)
    
    // Handle quota exceeded error specifically
    if (error instanceof Error && (error.message.includes("quota") || error.message.includes("429"))) {
      console.log("API quota exceeded, using fallback response")
      const fallbackResponse = emotion === "crisis" 
        ? "I'm here with you right now. Your feelings are valid, and you're not alone. If you're having thoughts of self-harm, please reach out to the National Suicide Prevention Lifeline at 988 (US) or your local crisis center. I care about you."
        : "I'm here to listen and support you. I'm currently experiencing high demand, but I'm still here for you. How can I help you feel better right now?"
      
      return {
        content: fallbackResponse,
        emotion_detected: "neutral"
      }
    }
    
    // Fallback response for other errors
    const fallbackResponse = emotion === "crisis" 
      ? "I'm here with you right now. Your feelings are valid, and you're not alone. If you're having thoughts of self-harm, please reach out to the National Suicide Prevention Lifeline at 988 (US) or your local crisis center. I care about you."
      : "I'm here to listen and support you. Your feelings matter, and I want you to know that you're not alone in this. How can I help you feel better right now?"
    
    return {
      content: fallbackResponse,
      emotion_detected: "neutral"
    }
  }
}

// Helper function to detect emotion in AI responses
function detectEmotionInResponse(response: string): string {
  const text = response.toLowerCase()
  
  // Crisis indicators
  if (text.includes("crisis") || text.includes("self-harm") || text.includes("lifeline")) {
    return "crisis"
  }
  
  // Anxiety indicators
  if (text.includes("anxious") || text.includes("worried") || text.includes("calm") || text.includes("breathing")) {
    return "anxiety"
  }
  
  // Depression indicators
  if (text.includes("depressed") || text.includes("sad") || text.includes("hopeless") || text.includes("worth")) {
    return "depression"
  }
  
  // Joy indicators
  if (text.includes("happy") || text.includes("great") || text.includes("wonderful") || text.includes("celebrate")) {
    return "joy"
  }
  
  // Stress indicators
  if (text.includes("stress") || text.includes("overwhelmed") || text.includes("pressure")) {
    return "stress"
  }
  
  return "neutral"
}
