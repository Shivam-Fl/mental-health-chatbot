"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, Clock, MessageSquare, Heart, Brain, Target, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SessionAnalyticsProps {
  conversationId: string
  onClose?: () => void
}

interface AnalyticsData {
  totalMessages: number
  sessionDuration: number
  emotionTrends: Array<{
    timestamp: string
    emotion: string
    confidence: number
  }>
  topicAnalysis: Array<{
    topic: string
    frequency: number
    sentiment: number
  }>
  progressMetrics: {
    copingStrategiesDiscussed: number
    insightsGained: number
    actionItemsIdentified: number
  }
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
      console.log("Loading analytics for conversation:", conversationId)
      const response = await fetch(`/api/conversations/${conversationId}/analytics`)
      console.log("Analytics API response status:", response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Analytics API error:", response.status, errorText)
        setError(`Failed to load analytics (${response.status})`)
        setAnalytics(null)
        return
      }
      const data = await response.json()
      console.log("Analytics data received:", data)
      console.log("Emotion trends count:", data.analytics?.emotionTrends?.length || 0)
      console.log("Topic analysis count:", data.analytics?.topicAnalysis?.length || 0)
      console.log("Total messages:", data.analytics?.totalMessages || 0)
      setAnalytics(data.analytics || null)
    } catch (error) {
      console.error("Failed to load analytics:", error)
      setError(error instanceof Error ? error.message : "Failed to load analytics")
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
          <p className="text-muted-foreground mb-4">
            {error || "No analytics data available for this session."}
          </p>
          <button 
            onClick={loadAnalytics}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Session Analytics</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadAnalytics}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onClose && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Exchanged</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalMessages}</div>
            <p className="text-xs text-muted-foreground">Active conversation flow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(analytics.sessionDuration)}</div>
            <p className="text-xs text-muted-foreground">Time invested in healing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights Gained</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.progressMetrics.insightsGained}</div>
            <p className="text-xs text-muted-foreground">Therapeutic breakthroughs</p>
          </CardContent>
        </Card>
      </div>

      {/* Emotion Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Emotional Journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.emotionTrends && analytics.emotionTrends.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.emotionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).toLocaleTimeString()} />
                  <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleString()}
                    formatter={(value: number | undefined, name) => [value !== undefined ? `${(value * 100).toFixed(1)}%` : 'N/A', "Confidence"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ fill: "var(--primary)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="mb-2">No emotion data available yet</p>
                <p className="text-xs">Continue chatting to see your emotional journey</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topic Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Discussion Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topicAnalysis && analytics.topicAnalysis.length > 0 ? (
            <div className="space-y-4">
              {analytics.topicAnalysis.map((topic, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{topic.topic}</span>
                  <Badge variant={topic.sentiment > 0.5 ? "default" : "secondary"}>{topic.frequency} mentions</Badge>
                </div>
                <Progress value={topic.sentiment * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Sentiment:{" "}
                  {topic.sentiment > 0.7 ? "Positive" : topic.sentiment > 0.4 ? "Neutral" : "Needs attention"}
                </p>
              </div>
            ))}
          </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p className="mb-2">No topics detected yet</p>
              <p className="text-xs">Continue the conversation to analyze discussion themes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Therapeutic Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {analytics.progressMetrics.copingStrategiesDiscussed}
              </div>
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
