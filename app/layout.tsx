import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"

export const metadata: Metadata = {
  title: "Psyspace - Mental Health Marketplace",
  description:
    "Book verified psychiatrists and psychologists, attend paid sessions, share feedback, and access Psyspace's embedded AI support chatbot.",
  generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={GeistSans.className}>{children}</body>
    </html>
  )
}
