"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { VideoOff, Video, Mic, MicOff, Phone, PhoneOff, MicIcon } from "lucide-react"
import { useVideoCall } from "@/hooks/use-video-call"
import { useState, useCallback, useRef } from "react"
import { cn } from "@/lib/utils"
import { EmotionDebug } from "./emotion-debug"

interface VideoCallProps {
  conversationId?: string
  onSendMessage?: (content: string, messageType: "video") => void
}

export function VideoCall({ conversationId, onSendMessage }: VideoCallProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "streaming" | "processing">("idle")
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [lastVisualAnalysis, setLastVisualAnalysis] = useState<any>(null)
  const [rawExpressions, setRawExpressions] = useState<any>(null)
  const [aiResponse, setAiResponse] = useState("")
  const [lastProcessedTranscript, setLastProcessedTranscript] = useState("")
  const [isProcessingRequest, setIsProcessingRequest] = useState(false)
  const lastRequestTimeRef = useRef<number>(0)

  const { 
    isStreaming, 
    currentEmotion, 
    emotionConfidence, 
    error, 
    isListening,
    isVideoEnabled,
    isAudioEnabled,
    isManualListening,
    videoRef, 
    canvasRef, 
    toggleStreaming, 
    toggleVideo,
    toggleAudio,
    startListening,
    stopListening
  } = useVideoCall({
    onTranscript: (transcript, isFinal) => {
      console.log("Video call received transcript:", transcript, "isFinal:", isFinal)
      setCurrentTranscript(transcript)
      
      // Only process final transcripts that are meaningful and not already processed
      if (isFinal && transcript.trim() && transcript.trim().length > 2 && transcript.trim() !== lastProcessedTranscript) {
        console.log("Processing final transcript:", transcript)
        setLastProcessedTranscript(transcript.trim())
        processVideoInteraction(transcript, currentEmotion, emotionConfidence)
        // Clear the transcript after processing
        setTimeout(() => setCurrentTranscript(""), 1000)
      }
    },
    onEmotionDetected: (emotion, confidence) => {
      console.log("Video call received emotion:", emotion, confidence)
    },
    onVisualAnalysis: (analysis) => {
      console.log("Video call received visual analysis:", analysis)
      setLastVisualAnalysis(analysis)
      setRawExpressions(analysis.raw_expressions)
    },
    onError: (error) => {
      console.error("Video call error:", error)
    },
    onStatusChange: (newStatus) => {
      console.log("Video call status changed to:", newStatus)
      setStatus(newStatus)
    },
  })

  const processVideoInteraction = useCallback(async (transcript: string, emotion?: string | null, confidence?: number) => {
    if (!conversationId || !transcript || !transcript.trim()) {
      console.log("No transcript provided, skipping API call")
      return
    }

    // Throttle requests - prevent multiple rapid requests
    const now = Date.now()
    if (isProcessingRequest || (now - lastRequestTimeRef.current) < 2000) {
      console.log("Request throttled - too soon or already processing")
      return
    }

    try {
      console.log("Processing video interaction:", { transcript, emotion, confidence, conversationId })
      setIsProcessingRequest(true)
      lastRequestTimeRef.current = now
      setIsSpeaking(true)

      // Use video API call with enhanced data
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
        console.log("Video interaction processed successfully:", data)

        // Always speak AI response in video call mode
        if (data.response && data.response.trim()) {
          setAiResponse(data.response)
          try {
            // Stop any existing speech
            window.speechSynthesis?.cancel()
            
            const utterance = new SpeechSynthesisUtterance(data.response)
            utterance.rate = 0.9
            utterance.pitch = 1.0
            utterance.volume = 0.8
            utterance.lang = "en-US"
            
            utterance.onstart = () => {
              console.log("TTS started speaking")
            }
            
            utterance.onend = () => {
              console.log("TTS finished speaking")
              setIsSpeaking(false)
            }
            
            utterance.onerror = (event) => {
              console.error("TTS error:", event.error)
              setIsSpeaking(false)
            }
            
            // Wait a moment before speaking to ensure previous speech is stopped
            setTimeout(() => {
              window.speechSynthesis?.speak(utterance)
            }, 100)
          } catch (e) {
            console.error("TTS error:", e)
            setIsSpeaking(false)
          }
        } else {
          console.log("No response content to speak")
          setIsSpeaking(false)
        }
      } else {
        const errorText = await response.text()
        console.error("Video API error:", response.status, errorText)
        
        // Handle API quota exceeded error
        if (response.status === 429) {
          const fallbackResponse = "I'm here to listen and support you. I'm currently experiencing high demand, but I'm still here for you. How can I help you feel better right now?"
          try {
            window.speechSynthesis?.cancel()
            const utterance = new SpeechSynthesisUtterance(fallbackResponse)
            utterance.rate = 0.9
            utterance.pitch = 1.0
            utterance.volume = 0.8
            utterance.onend = () => setIsSpeaking(false)
            utterance.onerror = () => setIsSpeaking(false)
            window.speechSynthesis?.speak(utterance)
          } catch (e) {
            console.error("Fallback TTS error:", e)
            setIsSpeaking(false)
          }
        } else {
          setIsSpeaking(false)
        }
      }
    } catch (error) {
      console.error("Error processing video interaction:", error)
      
      // Provide fallback response for network errors
      const fallbackResponse = "I'm here to listen and support you. There seems to be a connection issue, but I'm still here for you. How can I help you feel better right now?"
      try {
        window.speechSynthesis?.cancel()
        const utterance = new SpeechSynthesisUtterance(fallbackResponse)
        utterance.rate = 0.9
        utterance.pitch = 1.0
        utterance.volume = 0.8
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)
        window.speechSynthesis?.speak(utterance)
      } catch (e) {
        console.error("Fallback TTS error:", e)
        setIsSpeaking(false)
      }
    } finally {
      setIsProcessingRequest(false)
    }
  }, [conversationId, currentEmotion, emotionConfidence, lastVisualAnalysis, isProcessingRequest])


  const getStatusInfo = () => {
    switch (status) {
      case "connecting":
        return { text: "Connecting...", color: "bg-yellow-500" }
      case "streaming":
        return { text: "Live", color: "bg-green-500" }
      case "processing":
        return { text: "Processing...", color: "bg-blue-500" }
      default:
        return { text: "Ready", color: "bg-gray-500" }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      {/* Video Preview */}
      <div className="relative w-full">
        <div className="bg-black rounded-xl overflow-hidden aspect-video relative shadow-2xl w-full">
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
              {/* Overlay with emotion indicator */}
              {currentEmotion && (
                <div className="absolute top-3 left-3 bg-black/80 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                  <span className="capitalize">{currentEmotion}</span>
                  <span className="ml-1 text-xs opacity-75">({Math.round(emotionConfidence * 100)}%)</span>
                </div>
              )}
              {/* Status indicator */}
              <div className="absolute top-3 right-3 bg-black/80 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">
                <div className={`w-2 h-2 rounded-full inline-block mr-2 ${statusInfo.color}`} />
                {statusInfo.text}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <div className="text-center text-white">
                <VideoOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {isVideoEnabled ? "Starting Camera..." : "Camera Disabled"}
                </p>
                <p className="text-sm opacity-75">
                  {isVideoEnabled ? "Please allow camera access" : "Enable camera to start video call"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-6">
        {/* Main call controls */}
        <div className="flex items-center justify-center">
          <Button
            onClick={toggleStreaming}
            size="lg"
            className={cn(
              "rounded-full w-20 h-20 shadow-2xl transition-all duration-300 hover:scale-110",
              isStreaming
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/50"
                : "bg-green-500 hover:bg-green-600 text-white shadow-green-500/50"
            )}
          >
            {isStreaming ? <PhoneOff className="h-8 w-8" /> : <Phone className="h-8 w-8" />}
          </Button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "default" : "outline"}
            size="lg"
            className={cn(
              "rounded-full px-4 sm:px-6 py-3 transition-all duration-300 hover:scale-105",
              isVideoEnabled 
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg" 
                : "border-2 border-gray-300 hover:border-gray-400"
            )}
          >
            {isVideoEnabled ? <Video className="h-4 w-4 sm:h-5 sm:w-5" /> : <VideoOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            <span className="ml-2 sm:ml-3 font-medium text-sm sm:text-base">{isVideoEnabled ? "Video On" : "Video Off"}</span>
          </Button>

          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "default" : "outline"}
            size="lg"
            className={cn(
              "rounded-full px-4 sm:px-6 py-3 transition-all duration-300 hover:scale-105",
              isAudioEnabled 
                ? "bg-green-500 hover:bg-green-600 text-white shadow-lg" 
                : "border-2 border-gray-300 hover:border-gray-400"
            )}
          >
            {isAudioEnabled ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
            <span className="ml-2 sm:ml-3 font-medium text-sm sm:text-base">{isAudioEnabled ? "Audio On" : "Audio Off"}</span>
          </Button>
        </div>

        {/* Speak Button - Only show when audio is enabled and not currently listening */}
        {isAudioEnabled && isStreaming && (
          <div className="flex items-center justify-center">
            <Button
              onClick={isListening ? stopListening : startListening}
              size="lg"
              className={cn(
                "rounded-full w-16 h-16 shadow-2xl transition-all duration-300 hover:scale-110",
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/50"
                  : "bg-purple-500 hover:bg-purple-600 text-white shadow-purple-500/50"
              )}
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
          </div>
        )}

        {/* Status and transcript */}
        <div className="space-y-4">
          {/* Status indicators */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 px-3 sm:px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
              <div className={cn("w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse", statusInfo.color)} />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{statusInfo.text}</span>
            </div>
            
            {isListening && (
              <Badge variant="secondary" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 animate-pulse">
                🎤 Listening - Speak now
              </Badge>
            )}
            
            {currentTranscript && !isSpeaking && (
              <Badge variant="outline" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                📝 Processing...
              </Badge>
            )}
            
            {isProcessingRequest && (
              <Badge variant="outline" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">
                ⏳ Sending request...
              </Badge>
            )}
            
            {isSpeaking && (
              <Badge variant="default" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                🔊 Speaking
              </Badge>
            )}
          </div>

          {/* Transcript display */}
          {currentTranscript && (
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">U</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">You said:</p>
                  <p className="text-gray-700 dark:text-gray-300">{currentTranscript}</p>
                </div>
              </div>
            </Card>
          )}

          {/* AI Response display */}
          {aiResponse && (
            <Card className="p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 border-green-200 dark:border-green-800 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Aura responded:</p>
                  <p className="text-gray-700 dark:text-gray-300">{aiResponse}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Error display */}
          {error && (
            <Card className="p-4 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950/30 dark:to-pink-950/30 border-red-200 dark:border-red-800 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">⚠</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Error:</p>
                  <p className="text-gray-700 dark:text-gray-300">{error}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isStreaming 
              ? (isAudioEnabled 
                  ? "🎤 Click the purple microphone button to speak, then click again to stop"
                  : "🎥 I can see your expressions for emotional understanding"
                )
              : "📞 Click the call button to start a video conversation with AI"
            }
          </p>
        </div>
      </div>
      
      {/* Debug component */}
      <EmotionDebug 
        currentEmotion={currentEmotion}
        emotionConfidence={emotionConfidence}
        rawExpressions={rawExpressions}
      />
    </div>
  )
}
