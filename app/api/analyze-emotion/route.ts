import { GoogleGenerativeAI } from "@google/generative-ai"
import { z } from "zod"

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY environment variable is not set")
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

const emotionAnalysisSchema = z.object({
  emotion: z.enum(["joy", "sadness", "anger", "fear", "surprise", "disgust", "neutral", "anxiety", "stress"]),
  confidence: z.number().min(0).max(1),
  facial_features: z.object({
    eyes: z.string().describe("Description of eye expression"),
    mouth: z.string().describe("Description of mouth expression"),
    eyebrows: z.string().describe("Description of eyebrow position"),
    overall_expression: z.string().describe("Overall facial expression description"),
  }),
  mental_health_indicators: z.array(z.string()).describe("Potential mental health indicators observed"),
})

export async function POST(req: Request) {
  try {
    console.log("[DEBUG] Emotion analysis API called")
    const { image } = await req.json()

    if (!image) {
      console.log("[DEBUG] No image provided")
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    console.log("[DEBUG] Image received, length:", image.length)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    const prompt = `Analyze this facial image for emotional state and mental health indicators. Focus on:

1. Primary emotion (joy, sadness, anger, fear, surprise, disgust, neutral, anxiety, stress)
2. Confidence level (0-1) in your assessment
3. Detailed facial feature analysis (eyes, mouth, eyebrows)
4. Overall expression description
5. Any potential mental health indicators you observe

Be sensitive and professional in your analysis, as this is for mental health support purposes. Look for signs of:
- Depression (flat affect, downturned mouth, tired eyes)
- Anxiety (tense features, wide eyes, tight jaw)
- Stress (furrowed brow, tense muscles)
- Emotional distress (tears, strained expression)

Provide a confidence score based on how clear the emotional indicators are.

Please respond in JSON format with the following structure:
{
  "emotion": "one of: joy, sadness, anger, fear, surprise, disgust, neutral, anxiety, stress",
  "confidence": 0.0-1.0,
  "facial_features": {
    "eyes": "description of eye expression",
    "mouth": "description of mouth expression", 
    "eyebrows": "description of eyebrow position",
    "overall_expression": "overall facial expression description"
  },
  "mental_health_indicators": ["array of potential indicators"]
}`

    console.log("[DEBUG] Sending to Gemini for analysis")
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        },
      },
    ])

    console.log("[DEBUG] Gemini analysis completed")
    const response = await result.response
    const text = response.text()
    console.log("[DEBUG] Gemini response text:", text.substring(0, 200))

    // Parse the JSON response
    let analysisResult
    try {
      analysisResult = JSON.parse(text)
      console.log("[DEBUG] Parsed analysis result:", analysisResult)
    } catch (parseError) {
      console.error("[DEBUG] Failed to parse AI response:", text)
      // Return a fallback result instead of throwing
      analysisResult = {
        emotion: "neutral",
        confidence: 0.5,
        facial_features: {
          eyes: "Unable to analyze",
          mouth: "Unable to analyze",
          eyebrows: "Unable to analyze",
          overall_expression: "Analysis failed"
        },
        mental_health_indicators: []
      }
    }

    return Response.json({
      emotion: analysisResult.emotion,
      confidence: analysisResult.confidence,
      analysis: analysisResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[DEBUG] Emotion analysis error:", error)
    // Return a valid response instead of 500 error to prevent UI issues
    return Response.json({
      emotion: "neutral",
      confidence: 0.3,
      facial_features: {
        eyes: "Analysis unavailable",
        mouth: "Analysis unavailable", 
        eyebrows: "Analysis unavailable",
        overall_expression: "Unable to analyze at this time"
      },
      mental_health_indicators: [],
      error: "Analysis temporarily unavailable",
      timestamp: new Date().toISOString(),
    })
  }
}
