import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { ChatLauncher } from "@/components/chat/chat-launcher"

export const metadata: Metadata = {
  title: "Aura - Mental Health Professional Marketplace",
  description: "Book psychiatrists and psychologists, share feedback and social posts, and access the Aura chatbot anytime.",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={GeistSans.className}>
        {children}
        <ChatLauncher />
      </body>
    </html>
  )
}
