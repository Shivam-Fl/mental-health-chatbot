"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { X, VideoOff, Video, Mic, MicOff, PhoneOff } from "lucide-react"
import { useVideoCall } from "@/hooks/use-video-call"
import { useState, useCallback, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

// Constants for video call timing
const AUTO_START_LISTENING_DELAY_MS = 1500
const AI_RESPONSE_RESTART_DELAY_MS = 500

interface FullscreenVideoCallProps {
  conversationId?: string
  onClose: () => void
}

interface VisualAnalysis {
  raw_expressions?: any
  [key: string]: any
}

export function FullscreenVideoCall({ conversationId, onClose }: FullscreenVideoCallProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "processing">("idle")
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastVisualAnalysis, setLastVisualAnalysis] = useState<VisualAnalysis | null>(null)
  const [aiResponse, setAiResponse] = useState("")
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("")
  const [isProcessingRequest, setIsProcessingRequest] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const lastRequestTimeRef = useRef<number>(0)

  const { 
    isStreaming, 
    currentEmotion, 
    emotionConfidence, 
    error, 
    isListening,
    isVideoEnabled,
    isAudioEnabled,
    videoRef, 
    canvasRef, 
    toggleStreaming, 
    toggleVideo,
    toggleAudio,
    startListening,
    stopListening
  } = useVideoCall({
    onTranscript: (transcript, isFinal) => {
      setCurrentTranscript(transcript)
      
      const trimmedTranscript = transcript.trim()
      if (isFinal && trimmedTranscript && trimmedTranscript.length > 2 && trimmedTranscript !== lastProcessedTranscript) {
        setLastProcessedTranscript(trimmedTranscript)
        processVideoInteraction(transcript, currentEmotion, emotionConfidence)
        setTimeout(() => setCurrentTranscript(""), 1000)
      }
    },
    onEmotionDetected: (emotion, confidence) => {
      console.log("Video call received emotion:", emotion, confidence)
    },
    onVisualAnalysis: (analysis) => {
      setLastVisualAnalysis(analysis)
    },
    onError: (error) => {
      console.error("Video call error:", error)
    },
    onStatusChange: (newStatus) => {
      setStatus(newStatus)
    },
  })

  // Track call duration
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isStreaming])

  // Auto-start video call when modal opens
  useEffect(() => {
    if (!isStreaming) {
      // Small delay to allow modal to render
      setTimeout(() => {
        toggleStreaming()
      }, AI_RESPONSE_RESTART_DELAY_MS)
    }
  }, [])

  // Start listening once when streaming and audio are ready (one-time only)
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (isStreaming && isAudioEnabled && !isListening && !isSpeaking) {
      // Wait a bit for stream to stabilize, then start listening once
      timeout = setTimeout(() => {
        if (!isListening && !isSpeaking) {
          console.log("Initial listening start")
          startListening()
        }
      }, AUTO_START_LISTENING_DELAY_MS)
    }
    return () => clearTimeout(timeout)
  }, [isStreaming, isAudioEnabled]) // Only depend on these, not listening/speaking state

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const processVideoInteraction = useCallback(async (transcript: string, emotion?: string | null, confidence?: number) => {
    if (!conversationId || !transcript || !transcript.trim()) {
      return
    }

    const now = Date.now()
    if (isProcessingRequest || (now - lastRequestTimeRef.current) < 2000) {
      return
    }

    try {
      setIsProcessingRequest(true)
      lastRequestTimeRef.current = now
      setIsSpeaking(true)

      const response = await fetch("/api/chat/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim() || undefined,
          emotion: emotion || undefined,
          confidence: confidence || 0,
          conversationId,
          visualAnalysis: lastVisualAnalysis || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()

        if (data.response && data.response.trim()) {
          setAiResponse(data.response)
          try {
            window.speechSynthesis?.cancel()
            
            const utterance = new SpeechSynthesisUtterance(data.response)
            utterance.rate = 0.9
            utterance.pitch = 1.0
            utterance.volume = 0.8
            utterance.lang = "en-US"
            
            utterance.onend = () => {
              setIsSpeaking(false)
              // Auto-restart listening after AI finishes speaking for real-time flow
              if (isAudioEnabled && isStreaming) {
                setTimeout(() => {
                  startListening()
                }, AI_RESPONSE_RESTART_DELAY_MS)
              }
            }
            utterance.onerror = () => {
              setIsSpeaking(false)
              // Auto-restart listening even on error
              if (isAudioEnabled && isStreaming) {
                setTimeout(() => {
                  startListening()
                }, AI_RESPONSE_RESTART_DELAY_MS)
              }
            }
            
            setTimeout(() => {
              window.speechSynthesis?.speak(utterance)
            }, 100)
          } catch (e) {
            console.error("TTS error:", e)
            setIsSpeaking(false)
            // Auto-restart listening on TTS error
            if (isAudioEnabled && isStreaming) {
              setTimeout(() => {
                startListening()
              }, AI_RESPONSE_RESTART_DELAY_MS)
            }
          }
        } else {
          setIsSpeaking(false)
          // Auto-restart listening if no response
          if (isAudioEnabled && isStreaming) {
            setTimeout(() => {
              startListening()
            }, AI_RESPONSE_RESTART_DELAY_MS)
          }
        }
      } else {
        setIsSpeaking(false)
        // Auto-restart listening on API error
        if (isAudioEnabled && isStreaming) {
          setTimeout(() => {
            startListening()
          }, AI_RESPONSE_RESTART_DELAY_MS)
        }
      }
    } catch (error) {
      console.error("Error processing video interaction:", error)
      setIsSpeaking(false)
      // Auto-restart listening on error
      if (isAudioEnabled && isStreaming) {
        setTimeout(() => {
          startListening()
        }, AI_RESPONSE_RESTART_DELAY_MS)
      }
    } finally {
      setIsProcessingRequest(false)
    }
  }, [conversationId, lastVisualAnalysis, isProcessingRequest, isAudioEnabled, isStreaming, startListening])

  const handleEndCall = () => {
    if (isStreaming) {
      toggleStreaming()
    }
    window.speechSynthesis?.cancel()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <h2 className="text-white text-lg font-semibold">Aura Video Call</h2>
            {isStreaming && (
              <Badge variant="secondary" className="font-mono bg-white/20 text-white border-white/30">
                {formatDuration(callDuration)}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleEndCall}
            className="rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Video container */}
      <div className="flex-1 relative flex items-center justify-center">
        {isStreaming && isVideoEnabled ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ display: 'none' }}
            />
            
            {/* Emotion overlay */}
            {currentEmotion && (
              <div className="absolute top-20 left-4 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm">
                <span className="capitalize">{currentEmotion}</span>
                <span className="ml-2 text-xs opacity-75">({Math.round(emotionConfidence * 100)}%)</span>
              </div>
            )}

            {/* Status badges */}
            <div className="absolute top-20 right-4 flex flex-col gap-2">
              {isListening && (
                <Badge className="bg-red-500 text-white animate-pulse">
                  🎤 Listening
                </Badge>
              )}
              {isSpeaking && (
                <Badge className="bg-blue-500 text-white animate-pulse">
                  🔊 Speaking
                </Badge>
              )}
              {isProcessingRequest && (
                <Badge className="bg-yellow-500 text-white">
                  ⏳ Processing
                </Badge>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-gray-900 to-black">
            <div className="text-center text-white">
              <VideoOff className="h-24 w-24 mx-auto mb-6 opacity-50" />
              <p className="text-xl font-medium mb-2">
                {isVideoEnabled ? "Starting Camera..." : "Camera Disabled"}
              </p>
              <p className="text-sm opacity-75">
                {isVideoEnabled ? "Please allow camera access" : "Enable camera to start video call"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Transcript overlay */}
      {(currentTranscript || aiResponse) && (
        <div className="absolute bottom-28 sm:bottom-32 left-2 right-2 sm:left-4 sm:right-4 max-w-2xl mx-auto space-y-2">
          {currentTranscript && (
            <Card className="p-3 bg-black/80 backdrop-blur-sm border-blue-500/50 animate-in fade-in-0 slide-in-from-bottom-4">
              <p className="text-sm text-blue-300 mb-1">You:</p>
              <p className="text-white text-sm">{currentTranscript}</p>
            </Card>
          )}
          {aiResponse && (
            <Card className="p-3 bg-black/80 backdrop-blur-sm border-green-500/50 animate-in fade-in-0 slide-in-from-bottom-4">
              <p className="text-sm text-green-300 mb-1">Aura:</p>
              <p className="text-white text-sm">{aiResponse}</p>
            </Card>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 sm:p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 sm:gap-4">
          <Button
            onClick={toggleVideo}
            variant="outline"
            size="lg"
            className={cn(
              "rounded-full w-12 h-12 sm:w-14 sm:h-14 border-2 transition-all",
              isVideoEnabled 
                ? "bg-white/20 border-white/30 text-white hover:bg-white/30" 
                : "bg-red-500/80 border-red-400 text-white hover:bg-red-500"
            )}
          >
            {isVideoEnabled ? <Video className="h-4 w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>

          <Button
            onClick={toggleAudio}
            variant="outline"
            size="lg"
            className={cn(
              "rounded-full w-12 h-12 sm:w-14 sm:h-14 border-2 transition-all",
              isAudioEnabled 
                ? "bg-white/20 border-white/30 text-white hover:bg-white/30" 
                : "bg-red-500/80 border-red-400 text-white hover:bg-red-500"
            )}
          >
            {isAudioEnabled ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
          </Button>

          <Button
            onClick={handleEndCall}
            size="lg"
            className="rounded-full w-14 h-14 sm:w-16 sm:h-16 bg-red-500 hover:bg-red-600 text-white shadow-2xl shadow-red-500/50 hover:scale-105 transition-all"
          >
            <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-center mt-4">
          <p className="text-sm text-white/70">
            {isStreaming 
              ? (isAudioEnabled 
                  ? (isListening ? "Listening... speak naturally" : "Processing your request...")
                  : "I can see your expressions for emotional understanding"
                )
              : "Starting video call..."
            }
          </p>
        </div>
      </div>
    </div>
  )
}
