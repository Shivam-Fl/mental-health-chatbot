"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import * as faceapi from 'face-api.js'

// Constants for emotion detection
const MIN_NON_NEUTRAL_CONFIDENCE = 0.3
const EMOTION_ANALYSIS_INTERVAL_MS = 2000

interface VideoCallOptions {
  onEmotionDetected?: (emotion: string, confidence: number) => void
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onVisualAnalysis?: (analysis: any) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: "idle" | "connecting" | "streaming" | "processing") => void
}

export function useVideoCall(options: VideoCallOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null)
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isManualListening, setIsManualListening] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isStreamingRef = useRef(false)
  const modelsLoadedRef = useRef(false)
  const isManuallyStoppedRef = useRef(false)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTranscriptTimeRef = useRef<number>(0)
  const optionsRef = useRef(options)
  const isVideoEnabledRef = useRef(isVideoEnabled)

  // Keep options ref in sync
  useEffect(() => {
    optionsRef.current = options
  }, [options])

  // Keep isVideoEnabledRef in sync
  useEffect(() => {
    isVideoEnabledRef.current = isVideoEnabled
  }, [isVideoEnabled])

  // Initialize speech recognition (like audio mode - on demand)
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()

      if (recognitionRef.current) {
        recognitionRef.current.continuous = false // Changed to false for on-demand
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"
        recognitionRef.current.maxAlternatives = 1

        recognitionRef.current.onresult = (event) => {
          console.log("Speech recognition result:", event)
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
          const isFinal = !!finalTranscript
          console.log("Transcript:", fullTranscript, "isFinal:", isFinal)
          
          // Only process if we have meaningful content
          if (fullTranscript.trim().length > 0) {
            optionsRef.current.onTranscript?.(fullTranscript, isFinal)
          }
        }

        recognitionRef.current.onstart = () => {
          console.log("Speech recognition started")
          setIsListening(true)
        }

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error:", event.error)
          
          if (event.error === "not-allowed") {
            console.error("Microphone access denied")
            setError("Microphone access denied. Please allow microphone access and try again.")
            setIsListening(false)
            setIsManualListening(false)
          } else if (event.error === "no-speech") {
            console.log("No speech detected - this is normal")
            // Don't set error for no-speech - it's expected
            setIsListening(false)
            setIsManualListening(false)
          } else if (event.error === "aborted") {
            console.log("Speech recognition aborted")
            setIsListening(false)
            setIsManualListening(false)
          }
        }

        recognitionRef.current.onend = () => {
          console.log("Speech recognition ended")
          setIsListening(false)
          setIsManualListening(false)
        }
      }
    } else {
      console.warn("Speech recognition not supported in this browser")
      setError("Speech recognition is not supported in this browser")
    }

    return () => {
      stopStreaming()
    }
  }, [])

  // Load face-api.js models from local /models directory
  useEffect(() => {
    const loadModels = async () => {
      try {
        console.log("Loading face-api.js models from local /models...")
        const MODEL_URL = '/models'
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ])
        modelsLoadedRef.current = true
        console.log("Face-api.js models loaded successfully")
      } catch (error) {
        console.error("Failed to load face-api.js models:", error)
        // Fallback to external URL if local fails
        try {
          console.log("Trying external model URL as fallback...")
          const FALLBACK_URL = 'https://justadudewhohacks.github.io/face-api.js/models'
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(FALLBACK_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(FALLBACK_URL),
          ])
          modelsLoadedRef.current = true
          console.log("Face-api.js models loaded from fallback URL")
        } catch (fallbackError) {
          console.error("Failed to load face-api.js models from fallback URL:", fallbackError)
          modelsLoadedRef.current = false
        }
      }
    }

    loadModels()
  }, [])

  const startStreaming = useCallback(async () => {
    try {
      console.log("Starting video call...")
      setError(null)
      setIsStreaming(true)
      isStreamingRef.current = true
      optionsRef.current.onStatusChange?.("connecting")

      // Check if media devices are available
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera and microphone access not supported in this browser")
      }

      // Get video and audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled ? {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: "user",
        } : false,
        audio: isAudioEnabled ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } : false,
      })

      streamRef.current = stream

      // Set up video element
      if (videoRef.current && isVideoEnabled) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
        videoRef.current.playsInline = true
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play().then(resolve).catch(reject)
          }
          videoRef.current!.onerror = reject
        })
      }

      optionsRef.current.onStatusChange?.("streaming")

      // Don't start speech recognition automatically - user will click to speak

      // Start emotion detection interval if video is enabled
      if (isVideoEnabled) {
        setTimeout(() => {
          if (isStreamingRef.current) {
            intervalRef.current = setInterval(() => {
              captureAndAnalyzeFrame()
            }, EMOTION_ANALYSIS_INTERVAL_MS) // Analyze every 2 seconds
          }
        }, 1000)
      }

      console.log("Video call initialization complete")
    } catch (err) {
      console.error("Video call start error:", err)
      let errorMessage = "Failed to start video call"
      
      if (err instanceof Error) {
        if (err.name === "NotAllowedError") {
          errorMessage = "Camera and microphone access denied. Please allow access and try again."
        } else if (err.name === "NotFoundError") {
          errorMessage = "No camera or microphone found. Please check your devices."
        } else if (err.name === "NotSupportedError") {
          errorMessage = "Video calling is not supported in this browser."
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
      setIsStreaming(false)
      isStreamingRef.current = false
      optionsRef.current.onError?.(new Error(errorMessage))
      optionsRef.current.onStatusChange?.("idle")
    }
  }, [isVideoEnabled, isAudioEnabled])

  const stopStreaming = useCallback(() => {
    console.log("Stopping video call")
    setIsStreaming(false)
    isStreamingRef.current = false
    optionsRef.current.onStatusChange?.("idle")

    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    // Clear speech timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current)
      speechTimeoutRef.current = null
    }

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // Clear emotion detection interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setCurrentEmotion(null)
    setEmotionConfidence(0)
    setIsListening(false)
  }, [])

  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming()
    } else {
      startStreaming()
    }
  }, [isStreaming, startStreaming, stopStreaming])

  const toggleVideo = useCallback(() => {
    const newVideoState = !isVideoEnabled
    setIsVideoEnabled(newVideoState)
    
    if (isStreaming && streamRef.current) {
      // Toggle video track without restarting stream
      const videoTracks = streamRef.current.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = newVideoState
        console.log("Video track enabled:", newVideoState)
      })
      
      // Start/stop emotion detection based on video state
      if (newVideoState) {
        setTimeout(() => {
          if (isStreamingRef.current) {
            intervalRef.current = setInterval(() => {
              captureAndAnalyzeFrame()
            }, 2000)
          }
        }, 1000)
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isVideoEnabled, isStreaming])

  const startListening = useCallback(async () => {
    if (!isAudioEnabled || !recognitionRef.current || isListening) return

    try {
      console.log("Starting manual speech recognition...")
      setIsManualListening(true)
      setError(null)
      recognitionRef.current.start()
    } catch (e) {
      console.error("Failed to start speech recognition:", e)
      setError("Failed to start speech recognition. Please try again.")
      setIsManualListening(false)
    }
  }, [isAudioEnabled, isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop()
        console.log("Stopped speech recognition")
      } catch (e) {
        console.log("Error stopping speech recognition:", e)
      }
    }
    setIsManualListening(false)
  }, [isListening])

  const toggleAudio = useCallback(() => {
    const newAudioState = !isAudioEnabled
    setIsAudioEnabled(newAudioState)
    
    if (isStreaming && streamRef.current) {
      // Toggle audio track without restarting stream
      const audioTracks = streamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = newAudioState
        console.log("Audio track enabled:", newAudioState)
      })
      
      // Stop listening if audio is disabled
      if (!newAudioState && isListening) {
        stopListening()
      }
    }
  }, [isAudioEnabled, isStreaming, isListening, stopListening])

  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreamingRef.current || !isVideoEnabledRef.current) {
      return
    }

    try {
      // Don't change global processing status for emotion detection - it's a background task
      const canvas = canvasRef.current
      const video = videoRef.current
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        return
      }

      // Check if video has dimensions and is ready
      if (video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
        return
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Use face-api.js for emotion detection
      const emotion = await analyzeEmotionWithFaceAPI(canvas, modelsLoadedRef.current)
      
      // Lower threshold for better emotion detection
      if (emotion.emotion && emotion.confidence > 0.1) {
        setCurrentEmotion(emotion.emotion)
        setEmotionConfidence(emotion.confidence)
        optionsRef.current.onEmotionDetected?.(emotion.emotion, emotion.confidence)
        console.log("Emotion detected:", emotion.emotion, "confidence:", emotion.confidence)
      }
      
      // Surface analysis to consumers
      optionsRef.current.onVisualAnalysis?.(emotion)
    } catch (error) {
      console.error("Error analyzing frame:", error)
    }
  }, [])

  return {
    isStreaming,
    isProcessing,
    currentEmotion,
    emotionConfidence,
    error,
    isListening,
    isVideoEnabled,
    isAudioEnabled,
    isManualListening,
    videoRef,
    canvasRef,
    startStreaming,
    stopStreaming,
    toggleStreaming,
    toggleVideo,
    toggleAudio,
    startListening,
    stopListening,
  }
}

// Helper functions for facial feature analysis with improved sensitivity
function getEyeExpression(expressions: any): string {
  if (expressions.surprised > 0.15) return "Wide/Alert"
  if (expressions.sad > 0.12) return "Droopy/Tired"
  if (expressions.fearful > 0.10) return "Wide/Fearful"
  return "Normal"
}

function getMouthExpression(expressions: any): string {
  if (expressions.happy > 0.15) return "Smiling"
  if (expressions.sad > 0.12) return "Downturned"
  if (expressions.angry > 0.10) return "Tight/Frowning"
  if (expressions.disgusted > 0.12) return "Disgusted"
  return "Neutral"
}

function getEyebrowExpression(expressions: any): string {
  if (expressions.angry > 0.10) return "Furrowed"
  if (expressions.surprised > 0.15) return "Raised"
  if (expressions.sad > 0.12) return "Lowered"
  if (expressions.fearful > 0.10) return "Raised/Fearful"
  return "Normal"
}

// Accurate emotion detection using face-api.js ML models
async function analyzeEmotionWithFaceAPI(canvas: HTMLCanvasElement, modelsLoaded: boolean) {
  try {
    if (!modelsLoaded) {
      return {
        emotion: "neutral",
        confidence: 0.5,
        facial_features: {
          eyes: "Models loading...",
          mouth: "Models loading...",
          eyebrows: "Models loading...",
          overall_expression: "Loading ML models"
        },
        mental_health_indicators: [],
        timestamp: new Date().toISOString()
      }
    }

    // Detect faces and expressions with more sensitive settings
    const detections = await faceapi
      .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 416, // Larger input for better detection accuracy
        scoreThreshold: 0.2  // Lower threshold for better face detection
      }))
      .withFaceExpressions()

    if (detections.length === 0) {
      return {
        emotion: "neutral",
        confidence: 0.3,
        facial_features: {
          eyes: "No face detected",
          mouth: "No face detected",
          eyebrows: "No face detected",
          overall_expression: "Please ensure your face is visible"
        },
        mental_health_indicators: [],
        timestamp: new Date().toISOString()
      }
    }

    // Get the first (and likely only) face detection
    const detection = detections[0]
    const expressions = detection.expressions

    console.log("Raw expressions:", expressions)

    // Enhanced emotion detection with weighted analysis
    const emotionWeights = {
      'happy': 1.5,      // Boost happy detection more
      'sad': 1.6,        // Boost sad detection more  
      'angry': 1.7,      // Boost angry detection more
      'fearful': 1.5,    // Boost fearful detection more
      'surprised': 1.3,  // Boost surprise
      'disgusted': 1.4,  // Boost disgust detection
      'neutral': 0.6     // Reduce neutral bias even more
    }

    // Find the dominant emotion with weighted confidence
    let dominantEmotion = "neutral"
    let maxConfidence = 0
    let weightedConfidence = 0

    Object.entries(expressions).forEach(([emotion, confidence]) => {
      const weight = emotionWeights[emotion as keyof typeof emotionWeights] || 1.0
      const weighted = confidence * weight
      
      if (weighted > weightedConfidence) {
        weightedConfidence = weighted
        maxConfidence = confidence
        dominantEmotion = emotion
      }
    })

    // Lower thresholds for better emotion detection
    const emotionThresholds = {
      'happy': 0.08,     // Even lower threshold for happiness
      'sad': 0.08,       // Even lower threshold for sadness
      'angry': 0.06,     // Even lower threshold for anger
      'fearful': 0.06,   // Even lower threshold for fear
      'surprised': 0.10, // Lower threshold for surprise
      'disgusted': 0.08, // Lower threshold for disgust
      'neutral': 0.30    // Much higher threshold for neutral to avoid false neutrals
    }

    // Check if any emotion meets the threshold
    let detectedEmotion = "neutral"
    let detectedConfidence = 0

    Object.entries(expressions).forEach(([emotion, confidence]) => {
      const threshold = emotionThresholds[emotion as keyof typeof emotionThresholds] || 0.15
      if (confidence > threshold && confidence > detectedConfidence && emotion !== 'neutral') {
        detectedEmotion = emotion
        detectedConfidence = confidence
      }
    })

    // If we detected a non-neutral emotion, use it. Otherwise use weighted analysis
    let finalEmotion = dominantEmotion
    let finalConfidence = maxConfidence
    
    if (detectedEmotion !== "neutral" && detectedConfidence > 0.05) {
      finalEmotion = detectedEmotion
      finalConfidence = detectedConfidence
    } else if (dominantEmotion !== "neutral") {
      // Use dominant from weighted analysis
      finalEmotion = dominantEmotion
      finalConfidence = Math.max(maxConfidence, MIN_NON_NEUTRAL_CONFIDENCE) // Ensure at least 30% confidence for non-neutral
    }

    console.log("Final emotion detection:", { finalEmotion, finalConfidence, detectedEmotion, detectedConfidence, dominantEmotion, expressions })

    // Map face-api.js emotions to our emotion system
    const emotionMap: {[key: string]: string} = {
      'happy': 'joy',
      'sad': 'sadness',
      'angry': 'anger',
      'fearful': 'fear',
      'surprised': 'surprise',
      'disgusted': 'disgust',
      'neutral': 'neutral'
    }

    const mappedEmotion = emotionMap[finalEmotion] || finalEmotion

    return {
      emotion: mappedEmotion,
      confidence: finalConfidence,
      facial_features: {
        eyes: getEyeExpression(expressions),
        mouth: getMouthExpression(expressions),
        eyebrows: getEyebrowExpression(expressions),
        overall_expression: `${mappedEmotion} (${Math.round(finalConfidence * 100)}% confidence)`
      },
      mental_health_indicators: [],
      raw_expressions: expressions,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error("Face-api.js emotion analysis error:", error)
    return {
      emotion: "neutral",
      confidence: 0.5,
      facial_features: {
        eyes: "Analysis failed",
        mouth: "Analysis failed",
        eyebrows: "Analysis failed",
        overall_expression: "Fallback mode"
      },
      mental_health_indicators: [],
      timestamp: new Date().toISOString()
    }
  }
}
