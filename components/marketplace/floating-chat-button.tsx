"use client"

import Link from "next/link"
import { MessageCircle, X } from "lucide-react"
import { useState } from "react"

export function FloatingChatButton() {
  const [dismissed, setDismissed] = useState(false)
  const [showTooltip, setShowTooltip] = useState(true)

  if (dismissed) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Tooltip bubble */}
      {showTooltip && (
        <div className="relative flex items-center gap-2 rounded-2xl bg-card border border-border shadow-xl px-4 py-3 mb-1 max-w-[220px] animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
          <p className="text-xs font-medium leading-snug">Need to talk? Try the AI support chat →</p>
        </div>
      )}

      {/* Main Button */}
      <div className="flex items-center gap-2">
        <Link
          href="/chat"
          className="flex items-center gap-2.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-primary/40 hover:shadow-xl transition-all hover:scale-105"
          onMouseEnter={() => setShowTooltip(false)}
        >
          <MessageCircle className="size-5" />
          AI Chat
        </Link>
        <button
          onClick={() => setDismissed(true)}
          className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 transition-colors shadow"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
