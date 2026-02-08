"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface AudioStreamOptions {
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: "idle" | "listening" | "processing" | "speaking") => void
}

export function useAudioStream(options: AudioStreamOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = ""
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          const fullTranscript = finalTranscript || interimTranscript
          setTranscript(fullTranscript)
          options.onTranscript?.(fullTranscript, !!finalTranscript)
        }

        recognitionRef.current.onerror = (event) => {
          const error = new Error(`Speech recognition error: ${event.error}`)
          setError(error.message)
          options.onError?.(error)
        }

        recognitionRef.current.onend = () => {
          if (isListening) {
            // Restart recognition if we're still supposed to be listening
            try {
              recognitionRef.current?.start()
            } catch (e) {
              console.log("Recognition restart failed:", e)
            }
          }
        }
      }
    }

    // Initialize speech synthesis
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      stopListening()
      stopSpeaking()
    }
  }, [isListening])

  const startListening = useCallback(async () => {
    try {
      setError(null)
      setIsListening(true)
      options.onStatusChange?.("listening")

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Start speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.start()
      }

      // Set up media recorder for backup audio capture
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorderRef.current.start(1000) // Collect data every second
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to start audio recording")
      setError(error.message)
      setIsListening(false)
      options.onError?.(error)
      options.onStatusChange?.("idle")
    }
  }, [options])

  const stopListening = useCallback(() => {
    setIsListening(false)
    options.onStatusChange?.("idle")

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [options])

  const processAudio = useCallback(
    async (transcript: string, conversationId?: string, faceEmotion?: { emotion: string; confidence: number; visualAnalysis?: any }) => {
      if (!transcript.trim()) return

      console.log("[DEBUG] Processing audio with:", { transcript, conversationId, faceEmotion })
      setIsProcessing(true)
      options.onStatusChange?.("processing")

      try {
        // Send transcript to AI for processing
        const response = await fetch("/api/chat/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            audioData: audioChunksRef.current.length > 0 ? await blobToBase64(audioChunksRef.current[0]) : null,
            conversationId,
            faceEmotion: faceEmotion || null, // Include face emotion if video is enabled
            hasVideo: !!faceEmotion, // Flag to let AI know video is available
          }),
        })

        if (!response.ok) throw new Error("Failed to process audio")

        const data = await response.json()

        // Speak the response
        if (data.response) {
          await speakText(data.response)
        }

        // Clear transcript after processing
        setTranscript("")
        audioChunksRef.current = []
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to process audio")
        setError(error.message)
        options.onError?.(error)
      } finally {
        setIsProcessing(false)
        options.onStatusChange?.(isListening ? "listening" : "idle")
      }
    },
    [isListening, options],
  )

  const speakText = useCallback(
    async (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!synthRef.current) {
          reject(new Error("Speech synthesis not available"))
          return
        }

        setIsSpeaking(true)
        options.onStatusChange?.("speaking")

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1.0
        utterance.volume = 0.8

        // Try to use a more natural voice
        const voices = synthRef.current.getVoices()
        const preferredVoice = voices.find(
          (voice) => voice.name.includes("Natural") || voice.name.includes("Enhanced") || voice.lang.startsWith("en"),
        )
        if (preferredVoice) {
          utterance.voice = preferredVoice
        }

        utterance.onend = () => {
          setIsSpeaking(false)
          options.onStatusChange?.(isListening ? "listening" : "idle")
          resolve()
        }

        utterance.onerror = (event) => {
          setIsSpeaking(false)
          options.onStatusChange?.(isListening ? "listening" : "idle")
          reject(new Error(`Speech synthesis error: ${event.error}`))
        }

        synthRef.current.speak(utterance)
      })
    },
    [isListening, options],
  )

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      options.onStatusChange?.(isListening ? "listening" : "idle")
    }
  }, [isListening, options])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    toggleListening,
    processAudio,
    speakText,
    stopSpeaking,
  }
}

// Helper function to convert blob to base64
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(",")[1]) // Remove data:audio/wav;base64, prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}
