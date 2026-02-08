"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface SpeechSynthesisOptions {
  onStart?: () => void
  onEnd?: () => void
  onError?: (error: Error) => void
}

export function useSpeechSynthesis(options: SpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  const speakText = useCallback(
    async (text: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!synthRef.current) {
          reject(new Error("Speech synthesis not available"))
          return
        }

        setIsSpeaking(true)
        optionsRef.current.onStart?.()

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
          optionsRef.current.onEnd?.()
          resolve()
        }

        utterance.onerror = (event) => {
          setIsSpeaking(false)
          const error = new Error(`Speech synthesis error: ${event.error}`)
          optionsRef.current.onError?.(error)
          reject(error)
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
      optionsRef.current.onEnd?.()
    }
  }, [])

  return {
    isSpeaking,
    speakText,
    stopSpeaking,
  }
}
