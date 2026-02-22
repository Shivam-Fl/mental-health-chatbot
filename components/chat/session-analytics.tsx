"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Minus, Clock, MessageSquare, Heart, Brain, Target, RefreshCw, X, Mic, Video, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SessionAnalyticsProps {
  conversationId: string
  onClose?: () => void
}

interface EmotionTrend {
  timestamp: string
  emotion: string
  confidence: number
  source: string
}

interface AnalyticsData {
  totalMessages: number
  sessionDuration: number
  sessionTypes: { text: number; audio: number; video: number }
  emotionTrends: EmotionTrend[]
  emotionDistribution: Record<string, number>
  topicAnalysis: Array<{ topic: string; frequency: number; sentiment: number }>
  progressMetrics: { copingStrategiesDiscussed: number; insightsGained: number; actionItemsIdentified: number }
  overallSentiment: number
}

// Map emotion label → display colour
const EMOTION_COLORS: Record<string, string> = {
  crisis: "#ef4444",
  anxiety: "#f97316",
  depression: "#6366f1",
  stress: "#eab308",
  anger: "#dc2626",
  fear: "#8b5cf6",
  joy: "#22c55e",
  surprise: "#06b6d4",
  disgust: "#78716c",
  neutral: "#94a3b8",
  sadness: "#60a5fa",
}

function emotionColor(emotion: string) {
  return EMOTION_COLORS[emotion?.toLowerCase()] || "#94a3b8"
}

// Convert sentiment -1…+1 to a human label
function sentimentLabel(s: number) {
  if (s >= 0.5) return { label: "Positive", color: "text-green-600 dark:text-green-400" }
  if (s <= -0.5) return { label: "Negative", color: "text-red-600 dark:text-red-400" }
  return { label: "Mixed / Neutral", color: "text-muted-foreground" }
}

export function SessionAnalytics({ conversationId, onClose }: SessionAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (conversationId) {
      loadAnalytics()
    }
  }, [conversationId])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/conversations/${conversationId}/analytics`)
      if (!response.ok) {
        setError(`Failed to load analytics (${response.status})`)
        setAnalytics(null)
        return
      }
      const data = await response.json()
      setAnalytics(data.analytics || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">{error || "No analytics data available for this session."}</p>
          <button onClick={loadAnalytics} className="text-sm text-primary hover:underline">
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const sentiment = sentimentLabel(analytics.overallSentiment ?? 0)

  // Prepare emotion distribution for bar chart
  const emotionDistData = Object.entries(analytics.emotionDistribution || {})
    .filter(([, count]) => count > 0)
    .map(([emotion, count]) => ({ emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1), count, fill: emotionColor(emotion) }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Session Analytics</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">Exchanged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(analytics.sessionDuration)}</div>
            <p className="text-xs text-muted-foreground">Total session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.progressMetrics.insightsGained}</div>
            <p className="text-xs text-muted-foreground">Gained</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sentiment</CardTitle>
            {(analytics.overallSentiment ?? 0) >= 0.3
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : (analytics.overallSentiment ?? 0) <= -0.3
              ? <TrendingDown className="h-4 w-4 text-red-500" />
              : <Minus className="h-4 w-4 text-muted-foreground" />}
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${sentiment.color}`}>{sentiment.label}</div>
            <p className="text-xs text-muted-foreground">
              Score: {((analytics.overallSentiment ?? 0) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session type breakdown */}
      {analytics.sessionTypes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Session Modes Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {analytics.sessionTypes.text > 0 && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">{analytics.sessionTypes.text}</span>
                  <span className="text-xs text-muted-foreground">text</span>
                </div>
              )}
              {analytics.sessionTypes.audio > 0 && (
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">{analytics.sessionTypes.audio}</span>
                  <span className="text-xs text-muted-foreground">audio</span>
                </div>
              )}
              {analytics.sessionTypes.video > 0 && (
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{analytics.sessionTypes.video}</span>
                  <span className="text-xs text-muted-foreground">video</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotion distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Emotion Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {emotionDistData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emotionDistData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="emotion" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => [v ?? 0, "occurrences"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {emotionDistData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
              No emotion data yet — keep chatting
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emotion timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Emotional Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.emotionTrends && analytics.emotionTrends.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 pb-2">
                {analytics.emotionTrends.map((e, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    style={{ borderColor: emotionColor(e.emotion), color: emotionColor(e.emotion) }}
                    className="text-xs capitalize"
                    title={`${e.source} · ${new Date(e.timestamp).toLocaleTimeString()}`}
                  >
                    <span aria-label={e.source === "audio" ? "audio" : e.source === "video" ? "video" : "text"} role="img">
                      {e.source === "audio" ? "🎙" : e.source === "video" ? "📹" : "💬"}
                    </span>{" "}
                    {e.emotion}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.emotionTrends.length} emotional event{analytics.emotionTrends.length !== 1 ? "s" : ""} detected
                {" · hover badge for source & time"}
              </p>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No strong emotions detected yet — keep chatting
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Discussion Topics
            <Badge variant="secondary" className="text-xs ml-auto">AI-powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topicAnalysis && analytics.topicAnalysis.length > 0 ? (
            <div className="space-y-4">
              {analytics.topicAnalysis.map((topic, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{topic.topic}</span>
                    <Badge variant={topic.sentiment > 0.5 ? "default" : "secondary"}>
                      {topic.frequency} mention{topic.frequency !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <Progress value={topic.sentiment * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Tone:{" "}
                    {topic.sentiment > 0.7
                      ? "Positive / resolving"
                      : topic.sentiment > 0.4
                      ? "Neutral / processing"
                      : "Needs attention"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No clear topics detected yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Therapeutic progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Therapeutic Progress
            <Badge variant="secondary" className="text-xs ml-auto">AI-powered</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.progressMetrics.copingStrategiesDiscussed}</div>
              <p className="text-sm text-muted-foreground">Coping Strategies</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.progressMetrics.insightsGained}</div>
              <p className="text-sm text-muted-foreground">Insights Gained</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.progressMetrics.actionItemsIdentified}</div>
              <p className="text-sm text-muted-foreground">Action Items</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}