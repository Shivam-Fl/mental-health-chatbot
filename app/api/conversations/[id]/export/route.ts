import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id: conversationId } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format") || "json"

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .select(`
      *,
      messages(*),
      emotion_analyses(*)
    `)
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (format === "pdf") {
    // Generate PDF export
    const pdfContent = generatePDFContent(conversation)
    return new NextResponse(Buffer.from(pdfContent), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="conversation-${conversationId}.pdf"`,
      },
    })
  } else if (format === "txt") {
    // Generate text export
    const textContent = generateTextContent(conversation)
    return new NextResponse(textContent, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="conversation-${conversationId}.txt"`,
      },
    })
  }

  // Default JSON export
  return NextResponse.json({ conversation })
}

function generateTextContent(conversation: any): string {
  let content = `Mental Health Session Export\n`
  content += `================================\n\n`
  content += `Session: ${conversation.title}\n`
  content += `Date: ${new Date(conversation.created_at).toLocaleDateString()}\n`
  content += `Duration: ${conversation.messages?.length || 0} messages\n\n`

  if (conversation.summary) {
    content += `Summary:\n${conversation.summary}\n\n`
  }

  content += `Conversation:\n`
  content += `-------------\n\n`

  conversation.messages?.forEach((message: any, index: number) => {
    const timestamp = new Date(message.created_at).toLocaleTimeString()
    const role = message.role === "user" ? "You" : "AI Therapist"
    content += `[${timestamp}] ${role}: ${message.content}\n\n`
  })

  if (conversation.notes) {
    content += `Session Notes:\n`
    content += `--------------\n`
    content += `${conversation.notes}\n\n`
  }

  return content
}

function generatePDFContent(conversation: any): string {
  // In a real implementation, you'd use a PDF library like jsPDF or Puppeteer
  // For now, return a simple text content
  return generateTextContent(conversation)
}
