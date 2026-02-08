"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { X, Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react"
import { useAudioStream } from "@/hooks/use-audio-stream"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface FullscreenAudioCallProps {
  conversationId?: string
  onClose: () => void
}

export function FullscreenAudioCall({ conversationId, onClose }: FullscreenAudioCallProps) {
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle")
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [callDuration, setCallDuration] = useState(0)

  const { isListening, isProcessing, isSpeaking, transcript, error, toggleListening, processAudio, stopSpeaking } =
    useAudioStream({
      onTranscript: (transcript, isFinal) => {
        setCurrentTranscript(transcript)
        if (isFinal && transcript.trim()) {
          processAudio(transcript, conversationId)
        }
      },
      onError: (error) => {
        console.error("Audio stream error:", error)
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus)
      },
    })

  // Track call duration
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isListening])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = () => {
    if (isListening) {
      toggleListening()
    }
    if (isSpeaking) {
      stopSpeaking()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleEndCall}
        className="absolute top-4 right-4 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Main content */}
      <div className="w-full max-w-md px-6 flex flex-col items-center gap-8">
        {/* Avatar and status */}
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300",
            isListening 
              ? "bg-gradient-to-br from-green-400 to-blue-500 shadow-2xl shadow-green-500/50 scale-110 animate-pulse" 
              : "bg-gradient-to-br from-primary/30 to-accent/30"
          )}>
            <div className="w-28 h-28 rounded-full bg-background flex items-center justify-center">
              {isListening ? (
                <Mic className="h-12 w-12 text-green-500 animate-pulse" />
              ) : isSpeaking ? (
                <Volume2 className="h-12 w-12 text-blue-500 animate-pulse" />
              ) : (
                <Phone className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Aura Voice Call</h2>
            <div className="flex items-center gap-3 justify-center">
              <Badge variant="outline" className={cn(
                "transition-colors",
                isListening && "bg-green-500/10 text-green-600 border-green-500/20",
                isSpeaking && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                isProcessing && "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  isListening && "bg-green-500 animate-pulse",
                  isSpeaking && "bg-blue-500 animate-pulse",
                  isProcessing && "bg-yellow-500 animate-spin",
                  !isListening && !isSpeaking && !isProcessing && "bg-gray-500"
                )} />
                {isListening ? "Listening" : isSpeaking ? "Speaking" : isProcessing ? "Processing" : "Ready"}
              </Badge>
              {isListening && (
                <Badge variant="secondary" className="font-mono">
                  {formatDuration(callDuration)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Transcript display */}
        {currentTranscript && (
          <Card className="w-full p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800 animate-in fade-in-0 slide-in-from-bottom-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">You</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">You said:</p>
                <p className="text-gray-700 dark:text-gray-300 break-words">{currentTranscript}</p>
              </div>
            </div>
          </Card>
        )}

        {/* AI Response display */}
        {aiResponse && (
          <Card className="w-full p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 border-green-200 dark:border-green-800 animate-in fade-in-0 slide-in-from-bottom-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">AI</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Aura:</p>
                <p className="text-gray-700 dark:text-gray-300 break-words">{aiResponse}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Error display */}
        {error && (
          <Card className="w-full p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </Card>
        )}

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={toggleListening}
            disabled={isProcessing}
            className={cn(
              "rounded-full w-16 h-16 transition-all duration-300 shadow-lg",
              isListening && "border-green-500 bg-green-50 dark:bg-green-950/30"
            )}
          >
            {isListening ? <MicOff className="h-6 w-6 text-green-600" /> : <Mic className="h-6 w-6" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={handleEndCall}
            className="rounded-full w-20 h-20 shadow-2xl shadow-red-500/50 hover:scale-105 transition-all"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center max-w-sm">
          <p className="text-sm text-muted-foreground">
            {!isListening
              ? "Click the microphone to start talking. I'll listen and respond with voice."
              : "I'm listening... Speak naturally about what's on your mind."}
          </p>
        </div>
      </div>
    </div>
  )
}
