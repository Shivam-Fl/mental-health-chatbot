import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatInterface } from "@/components/chat/chat-interface"

export default async function ChatPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="h-screen bg-background">
      <ChatInterface user={user} />
    </div>
  )
}
