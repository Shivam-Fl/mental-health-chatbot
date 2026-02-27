/**
 * Vertex AI REST API helper — replaces the @google/generative-ai SDK.
 *
 * All AI requests are routed through a regional Vertex AI endpoint:
 *   https://{region}-aiplatform.googleapis.com/v1/publishers/google/models/{model}
 *
 * Set VERTEX_AI_REGION to override the region (default: asia-south1 / Mumbai).
 * Requires the VERTEX_AI_API_KEY environment variable.
 */

const DEFAULT_REGION = "asia-south1"
const REGION = process.env.VERTEX_AI_REGION ?? DEFAULT_REGION

const VERTEX_AI_BASE_URL = REGION && REGION.trim()
  ? `https://${REGION.trim()}-aiplatform.googleapis.com/v1/publishers/google/models`
  : "https://aiplatform.googleapis.com/v1/publishers/google/models"

/** Timeout in milliseconds for each Vertex AI fetch request (24 s). */
const REQUEST_TIMEOUT_MS = 24_000

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

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }

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
