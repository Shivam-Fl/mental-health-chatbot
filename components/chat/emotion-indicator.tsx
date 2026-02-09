"use client"

import { Badge } from "@/components/ui/badge"
import { Heart, AlertTriangle, Frown, Smile, Zap, HelpCircle, Minus } from "lucide-react"

interface EmotionIndicatorProps {
  emotion: string
  className?: string
}

const emotionConfig = {
  anxiety: { icon: AlertTriangle, color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", label: "Anxiety" },
  depression: { icon: Frown, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", label: "Depression" },
  anger: { icon: Zap, color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", label: "Anger" },
  joy: { icon: Smile, color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", label: "Joy" },
  stress: { icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20", label: "Stress" },
  confusion: { icon: HelpCircle, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20", label: "Confusion" },
  crisis: { icon: Heart, color: "bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/20", label: "Crisis" },
  neutral: { icon: Minus, color: "bg-muted text-muted-foreground border-border", label: "Neutral" },
}

export function EmotionIndicator({ emotion, className }: EmotionIndicatorProps) {
  const config = emotionConfig[emotion as keyof typeof emotionConfig] || emotionConfig.neutral
  const Icon = config.icon

  return (
    <Badge variant="outline" className={`${config.color} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}
