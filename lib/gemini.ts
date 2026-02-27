/**
 * Vertex AI REST API helper — replaces the @google/generative-ai SDK.
 *
 * All AI requests are routed through:
 *   https://aiplatform.googleapis.com/v1/publishers/google/models/{model}
 *
 * Requires the VERTEX_AI_API_KEY environment variable.
 */

const VERTEX_AI_BASE_URL =
  "https://aiplatform.googleapis.com/v1/publishers/google/models"

function getApiKey(): string {
  const apiKey = process.env.VERTEX_AI_API_KEY
  if (!apiKey) {
    throw new Error("VERTEX_AI_API_KEY environment variable is not set")
  }
  return apiKey
}

const DEFAULT_MODEL = "gemini-2.5-flash"

export function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ContentPart {
  text?: string
  inlineData?: { mimeType: string; data: string }
}

export interface Content {
  role: string
  parts: ContentPart[]
}

export interface GenerationConfig {
  temperature?: number
  maxOutputTokens?: number
}

interface GenerateContentRequest {
  contents: Content[]
  generationConfig?: GenerationConfig
}

interface CandidatePart {
  text?: string
}

interface Candidate {
  content?: {
    parts?: CandidatePart[]
    role?: string
  }
  finishReason?: string
}

interface GenerateContentResponseBody {
  candidates?: Candidate[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractText(candidates: Candidate[] | undefined): string {
  if (!candidates || candidates.length === 0) return ""
  return (
    candidates[0].content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? ""
  )
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Non-streaming content generation.
 * Returns the full text response.
 */
export async function generateContent(
  model: string,
  request: GenerateContentRequest,
): Promise<string> {
  const apiKey = getApiKey()
  const url = `${VERTEX_AI_BASE_URL}/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Vertex AI API error (${res.status}): ${errorBody}`)
  }

  const data: GenerateContentResponseBody = await res.json()
  const text = extractText(data.candidates).trim()
  if (!text) {
    throw new Error("Empty response from Vertex AI API")
  }
  return text
}

/**
 * Streaming content generation.
 * Note: since all current callers collect the complete response before
 * returning to the client, this uses the non-streaming endpoint internally
 * to avoid response-format ambiguity. If true streaming to the client is
 * needed in the future, this can be updated to parse SSE / NDJSON.
 */
export async function streamGenerateContent(
  model: string,
  request: GenerateContentRequest,
): Promise<string> {
  return generateContent(model, request)
}
