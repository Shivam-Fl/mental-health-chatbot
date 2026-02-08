"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { VolumeX, Phone, PhoneOff } from "lucide-react"
import { useAudioStream } from "@/hooks/use-audio-stream"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface AudioControlsProps {
  onTranscriptReceived?: (transcript: string) => void
  conversationId?: string
}

export function AudioControls({ onTranscriptReceived, conversationId }: AudioControlsProps) {
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle")
  const [currentTranscript, setCurrentTranscript] = useState("")

  const { isListening, isProcessing, isSpeaking, transcript, error, toggleListening, processAudio, stopSpeaking } =
    useAudioStream({
      onTranscript: (transcript, isFinal) => {
        setCurrentTranscript(transcript)
        if (isFinal && transcript.trim()) {
          processAudio(transcript, conversationId)
          onTranscriptReceived?.(transcript)
        }
      },
      onError: (error) => {
        console.error("Audio stream error:", error)
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus)
      },
    })

  const getStatusInfo = () => {
    switch (status) {
      case "listening":
        return { text: "Listening...", color: "bg-green-500/10 text-green-600 border-green-500/20" }
      case "processing":
        return { text: "Processing...", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" }
      case "speaking":
        return { text: "Speaking...", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" }
      default:
        return { text: "Ready", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* Status indicator */}
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={statusInfo.color}>
          <div
            className={cn("w-2 h-2 rounded-full mr-2", {
              "bg-green-500 animate-pulse": status === "listening",
              "bg-blue-500 animate-spin": status === "processing",
              "bg-purple-500 animate-pulse": status === "speaking",
              "bg-gray-500": status === "idle",
            })}
          />
          {statusInfo.text}
        </Badge>

        {error && <Badge variant="destructive">Error: {error}</Badge>}
      </div>

      {/* Live transcript */}
      {currentTranscript && (
        <div className="max-w-md text-center bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Listening...</span>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200 italic">"{currentTranscript}"</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          {/* Audio control */}
          <Button
            variant={isListening ? "destructive" : "default"}
            size="lg"
            onClick={toggleListening}
            className={cn(
              "rounded-full w-16 h-16 transition-all duration-300 shadow-lg hover:shadow-xl",
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white animate-pulse hover:scale-105"
                : "bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white hover:scale-105",
            )}
            disabled={isProcessing}
          >
            {isListening ? <PhoneOff className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>

          {isSpeaking && (
            <Button variant="outline" size="sm" onClick={stopSpeaking} className="text-muted-foreground">
              <VolumeX className="h-4 w-4 mr-2" />
              Stop Speaking
            </Button>
          )}
        </div>

        {/* Enhanced instructions */}
        <div className="text-center max-w-lg">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Voice Chat Mode</span>
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              {!isListening
                ? "Click the phone button to start talking. I'll listen and respond with voice."
                : "I'm listening... Speak naturally about what's on your mind. I'll respond when you pause."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
