"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ChatLauncher() {
  const pathname = usePathname()

  if (pathname?.startsWith("/chat")) {
    return null
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Link href="/chat" aria-label="Open Aura chatbot">
        <Button
          size="lg"
          className="rounded-full shadow-lg h-14 px-5 bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          Chat with Aura
        </Button>
      </Link>
    </div>
  )
}
