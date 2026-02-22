"use client"

import { useState, useRef, useCallback, useEffect } from "react"

// Constants for audio processing
const RECOGNITION_RESTART_DELAY_MS = 500

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
  const isListeningRef = useRef(false)
  const optionsRef = useRef(options)
  // Silence-detection debounce: accumulate final results before submitting
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const accumulatedFinalRef = useRef<string>("")
  // Guard against concurrent processAudio calls
  const isProcessingRef = useRef<boolean>(false)

  // Keep refs in sync with state
  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Initialize speech recognition once
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
            const result = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += result
            } else {
              interimTranscript += result
            }
          }

          if (finalTranscript) {
            // Accumulate final results across phrases; submit only after 1.5 s of silence
            accumulatedFinalRef.current = (accumulatedFinalRef.current + " " + finalTranscript).trim()
            const accumulated = accumulatedFinalRef.current

            // Update display immediately so the user sees what they've said
            setTranscript(accumulated)
            optionsRef.current.onTranscript?.(accumulated, false)

            // Reset silence timer — fire when the user has been quiet for 1.5 s
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null
              const toSubmit = accumulatedFinalRef.current
              if (toSubmit.trim()) {
                accumulatedFinalRef.current = ""
                optionsRef.current.onTranscript?.(toSubmit, true)
              }
            }, 1500)
          } else if (interimTranscript) {
            // Show interim text (prefixed with any accumulated finals)
            const display = accumulatedFinalRef.current
              ? `${accumulatedFinalRef.current} ${interimTranscript}`
              : interimTranscript
            setTranscript(display)
            optionsRef.current.onTranscript?.(display, false)
          }
        }

        recognitionRef.current.onerror = (event) => {
          if (event.error === "aborted" || event.error === "no-speech") {
            // These are expected errors, don't propagate
            console.log("Speech recognition:", event.error)
            return
          }
          const error = new Error(`Speech recognition error: ${event.error}`)
          setError(error.message)
          optionsRef.current.onError?.(error)
        }

        recognitionRef.current.onend = () => {
          // Only restart if we're still supposed to be listening AND not processing/speaking
          if (isListeningRef.current) {
            try {
              setTimeout(() => {
                // Double check we're still listening and not processing
                if (isListeningRef.current && recognitionRef.current) {
                  console.log("[DEBUG] Auto-restarting recognition")
                  recognitionRef.current.start()
                }
              }, 200)
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
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch (e) { /* ignore */ }
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, []) // Initialize only once

  const startListening = useCallback(async () => {
    try {
      setError(null)
      
      // Clear any pending silence state from a previous session
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      accumulatedFinalRef.current = ""

      // Stop any existing recognition first
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          // Ignore if already stopped
        }
      }
      
      setIsListening(true)
      isListeningRef.current = true
      optionsRef.current.onStatusChange?.("listening")

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Start speech recognition with a small delay to ensure previous one stopped
      if (recognitionRef.current) {
        setTimeout(() => {
          try {
            if (isListeningRef.current) {
              recognitionRef.current?.start()
            }
          } catch (e) {
            console.log("Recognition start error (may be already started):", e)
          }
        }, 200)
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
      isListeningRef.current = false
      optionsRef.current.onError?.(error)
      optionsRef.current.onStatusChange?.("idle")
    }
  }, [])

  const stopListening = useCallback(() => {
    // Cancel any pending silence timer and clear accumulated text
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    accumulatedFinalRef.current = ""

    setIsListening(false)
    isListeningRef.current = false
    optionsRef.current.onStatusChange?.("idle")

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
  }, [])

  const processAudio = useCallback(
    async (transcript: string, conversationId?: string, faceEmotion?: { emotion: string; confidence: number; visualAnalysis?: any }) => {
      if (!transcript.trim()) return

      // Guard: ignore duplicate call if already processing (prevents racing TTS)
      if (isProcessingRef.current) {
        console.log("[DEBUG] Already processing, ignoring duplicate call")
        return
      }
      isProcessingRef.current = true

      // Cancel any pending silence timer — we're submitting now
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      accumulatedFinalRef.current = ""

      console.log("Processing audio transcript:", transcript.substring(0, 60) + (transcript.length > 60 ? "..." : ""))
      
      // Stop listening while processing
      if (recognitionRef.current && isListeningRef.current) {
        try {
          console.log("[DEBUG] Stopping recognition for processing")
          recognitionRef.current.stop()
          isListeningRef.current = false
          setIsListening(false)
        } catch (e) {
          console.log("Error stopping recognition:", e)
        }
      }
      
      setIsProcessing(true)
      optionsRef.current.onStatusChange?.("processing")

      try {
        // Send transcript to AI for processing
        const response = await fetch("/api/chat/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            audioData: audioChunksRef.current.length > 0 ? await blobToBase64(audioChunksRef.current[0]) : null,
            conversationId,
            faceEmotion: faceEmotion || null,
            hasVideo: !!faceEmotion,
          }),
        })

        if (!response.ok) throw new Error("Failed to process audio")

        const data = await response.json()
        console.log("[DEBUG] Audio API response:", data)

        // Speak the response
        if (data.response) {
          await speakText(data.response)
        }

        // Clear transcript after processing
        setTranscript("")
        audioChunksRef.current = []
        
        // Restart listening after speaking completes
        console.log("[DEBUG] Restarting listening after response")
        setTimeout(() => {
          startListening()
        }, 500)
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to process audio")
        setError(error.message)
        optionsRef.current.onError?.(error)
        
        // Restart listening even on error
        setTimeout(() => {
          startListening()
        }, 500)
      } finally {
        setIsProcessing(false)
        isProcessingRef.current = false
        optionsRef.current.onStatusChange?.("idle")
      }
    },
    [startListening],
  )

  const speakText = useCallback(
    async (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!synthRef.current) {
          reject(new Error("Speech synthesis not available"))
          return
        }

        setIsSpeaking(true)
        optionsRef.current.onStatusChange?.("speaking")

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

        // Chrome workaround: keep speechSynthesis alive for long utterances
        const keepAlive = setInterval(() => {
          if (synthRef.current?.speaking) {
            synthRef.current.pause()
            synthRef.current.resume()
          }
        }, 10000)

        utterance.onend = () => {
          clearInterval(keepAlive)
          setIsSpeaking(false)
          optionsRef.current.onStatusChange?.("idle")
          resolve()
        }

        utterance.onerror = (event) => {
          clearInterval(keepAlive)
          setIsSpeaking(false)
          optionsRef.current.onStatusChange?.("idle")
          reject(new Error(`Speech synthesis error: ${event.error}`))
        }

        synthRef.current.speak(utterance)
      })
    },
    [],
  )

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      optionsRef.current.onStatusChange?.(isListeningRef.current ? "listening" : "idle")
    }
  }, [])

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
