"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface EmotionDebugProps {
  currentEmotion: string | null
  emotionConfidence: number
  rawExpressions?: any
}

export function EmotionDebug({ currentEmotion, emotionConfidence, rawExpressions }: EmotionDebugProps) {
  const [showDebug, setShowDebug] = useState(false)

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-xs z-50"
      >
        Debug Emotions
      </button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 p-4 bg-card/95 backdrop-blur-sm shadow-xl z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm">Emotion Debug</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current:</span>
          <Badge variant={currentEmotion === "neutral" ? "secondary" : "default"}>
            {currentEmotion || "None"} ({Math.round(emotionConfidence * 100)}%)
          </Badge>
        </div>
        
        {rawExpressions && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Raw Values:</span>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(rawExpressions).map(([emotion, confidence]) => (
                <div key={emotion} className="flex justify-between">
                  <span className="capitalize">{emotion}:</span>
                  <span className="font-mono">
                    {Math.round((confidence as number) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}


