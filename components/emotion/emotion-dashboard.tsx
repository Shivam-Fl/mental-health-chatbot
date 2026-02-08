"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { EmotionIndicator } from "../chat/emotion-indicator"
import { TrendingUp, TrendingDown, Brain, Heart, Activity } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface EmotionData {
  emotion_type: string
  confidence: number
  created_at: string
  analysis_data?: any
}

interface MoodTrend {
  date: string
  anxiety: number
  depression: number
  joy: number
  stress: number
  neutral: number
}

interface EmotionInsight {
  type: "pattern" | "improvement" | "concern" | "recommendation"
  title: string
  description: string
  confidence: number
}

export function EmotionDashboard() {
  const [emotionData, setEmotionData] = useState<EmotionData[]>([])
  const [moodTrends, setMoodTrends] = useState<MoodTrend[]>([])
  const [insights, setInsights] = useState<EmotionInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week")

  const supabase = createClient()

  useEffect(() => {
    loadEmotionData()
  }, [timeRange])

  const loadEmotionData = async () => {
    try {
      setIsLoading(true)

      // Calculate date range
      const now = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case "week":
          startDate.setDate(now.getDate() - 7)
          break
        case "month":
          startDate.setMonth(now.getMonth() - 1)
          break
        case "all":
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }

      // Fetch emotion data from messages table (which has emotion_detected field)
      const { data: messages, error } = await supabase
        .from("messages")
        .select("id, emotion_detected, created_at, role")
        .not("emotion_detected", "is", null)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })

      if (error) throw error

      // Map messages to emotion data format
      const emotions: EmotionData[] = (messages || [])
        .filter((m) => m.emotion_detected && m.emotion_detected !== "supportive")
        .map((m) => ({
          emotion_type: m.emotion_detected,
          confidence: 0.8,
          created_at: m.created_at,
        }))

      setEmotionData(emotions)

      // Process data for trends
      const trends = processMoodTrends(emotions)
      setMoodTrends(trends)

      // Generate insights
      const generatedInsights = generateInsights(emotions)
      setInsights(generatedInsights)
    } catch (error) {
      console.error("Error loading emotion data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const processMoodTrends = (emotions: EmotionData[]): MoodTrend[] => {
    const dailyEmotions: { [date: string]: { [emotion: string]: number[] } } = {}

    emotions.forEach((emotion) => {
      const date = new Date(emotion.created_at).toISOString().split("T")[0]
      if (!dailyEmotions[date]) {
        dailyEmotions[date] = {}
      }
      if (!dailyEmotions[date][emotion.emotion_type]) {
        dailyEmotions[date][emotion.emotion_type] = []
      }
      dailyEmotions[date][emotion.emotion_type].push(emotion.confidence)
    })

    return Object.entries(dailyEmotions).map(([date, emotions]) => {
      const avgEmotions: any = { date }

      Object.entries(emotions).forEach(([emotion, confidences]) => {
        avgEmotions[emotion] = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
      })

      return {
        date,
        anxiety: avgEmotions.anxiety || 0,
        depression: avgEmotions.depression || 0,
        joy: avgEmotions.joy || 0,
        stress: avgEmotions.stress || 0,
        neutral: avgEmotions.neutral || 0,
      }
    })
  }

  const generateInsights = (emotions: EmotionData[]): EmotionInsight[] => {
    const insights: EmotionInsight[] = []

    if (emotions.length === 0) return insights

    // Analyze emotion patterns
    const emotionCounts: { [key: string]: number } = {}
    const recentEmotions = emotions.slice(-10) // Last 10 emotions

    emotions.forEach((emotion) => {
      emotionCounts[emotion.emotion_type] = (emotionCounts[emotion.emotion_type] || 0) + 1
    })

    const mostCommonEmotion = Object.entries(emotionCounts).reduce((a, b) =>
      emotionCounts[a[0]] > emotionCounts[b[0]] ? a : b,
    )[0]

    // Pattern recognition
    if (emotionCounts.anxiety > emotions.length * 0.3) {
      insights.push({
        type: "concern",
        title: "Elevated Anxiety Levels",
        description:
          "You've been experiencing anxiety frequently. Consider practicing breathing exercises or speaking with a professional.",
        confidence: 0.8,
      })
    }

    if (emotionCounts.joy > emotions.length * 0.4) {
      insights.push({
        type: "improvement",
        title: "Positive Emotional Trend",
        description: "You've been experiencing more joy and positive emotions recently. Keep up the good work!",
        confidence: 0.9,
      })
    }

    // Recent trend analysis
    const recentAnxiety = recentEmotions.filter((e) => e.emotion_type === "anxiety").length
    const previousAnxiety = emotions.slice(-20, -10).filter((e) => e.emotion_type === "anxiety").length

    if (recentAnxiety < previousAnxiety && previousAnxiety > 0) {
      insights.push({
        type: "improvement",
        title: "Anxiety Reduction",
        description: "Your anxiety levels have decreased compared to earlier this period. This is a positive sign!",
        confidence: 0.7,
      })
    }

    // Recommendations based on patterns
    if (emotionCounts.stress > emotions.length * 0.25) {
      insights.push({
        type: "recommendation",
        title: "Stress Management",
        description:
          "Consider incorporating mindfulness practices or regular breaks into your routine to manage stress levels.",
        confidence: 0.6,
      })
    }

    return insights
  }

  const getCurrentMoodDistribution = () => {
    const recent = emotionData.slice(-20) // Last 20 emotions
    const distribution: { [key: string]: number } = {}

    recent.forEach((emotion) => {
      distribution[emotion.emotion_type] = (distribution[emotion.emotion_type] || 0) + 1
    })

    return Object.entries(distribution).map(([emotion, count]) => ({
      emotion,
      count,
      percentage: Math.round((count / recent.length) * 100),
    }))
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "improvement":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "concern":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case "pattern":
        return <Activity className="h-4 w-4 text-blue-600" />
      case "recommendation":
        return <Brain className="h-4 w-4 text-purple-600" />
      default:
        return <Heart className="h-4 w-4 text-muted-foreground" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const moodDistribution = getCurrentMoodDistribution()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Emotion Analytics</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Track your emotional patterns and mental health insights</p>
        </div>

        <div className="flex gap-2">
          <Button 
            variant={timeRange === "week" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTimeRange("week")}
            className="rounded-lg"
          >
            Week
          </Button>
          <Button
            variant={timeRange === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("month")}
            className="rounded-lg"
          >
            Month
          </Button>
          <Button 
            variant={timeRange === "all" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTimeRange("all")}
            className="rounded-lg"
          >
            All Time
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
          <TabsTrigger value="trends" className="rounded-lg">Trends</TabsTrigger>
          <TabsTrigger value="insights" className="rounded-lg">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Mood Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  Current Mood Distribution
                </CardTitle>
                <CardDescription>Based on your recent interactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {moodDistribution.map(({ emotion, count, percentage }) => (
                    <div key={emotion} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <EmotionIndicator emotion={emotion} />
                        <span className="text-sm font-medium">{count} times</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={percentage} className="w-24 h-2" />
                        <span className="text-sm font-semibold text-muted-foreground w-12 text-right">{percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Activity className="h-5 w-5 text-accent" />
                  </div>
                  Emotion Summary
                </CardTitle>
                <CardDescription>Key metrics for this {timeRange}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Total Interactions</span>
                    <Badge variant="outline" className="text-base font-semibold">{emotionData.length}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Most Common Emotion</span>
                    <EmotionIndicator emotion={moodDistribution[0]?.emotion || "neutral"} />
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Positive Emotions</span>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-base font-semibold">
                      {Math.round((moodDistribution.find((m) => m.emotion === "joy")?.percentage || 0) * 100) / 100}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Mood Trends Over Time</CardTitle>
              <CardDescription>Track how your emotions change over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={moodTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line type="monotone" dataKey="joy" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="anxiety" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="depression" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Emotion Frequency</CardTitle>
              <CardDescription>How often each emotion appears</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="emotion" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                AI-Generated Insights
              </CardTitle>
              <CardDescription>Personalized observations about your emotional patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {insights.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Brain className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Not enough data yet. Continue using the chatbot to generate insights.
                      </p>
                    </div>
                  ) : (
                    insights.map((insight, index) => (
                      <Card key={index} className="border-l-4 border-l-primary shadow-sm">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                              {getInsightIcon(insight.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-base mb-2">{insight.title}</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{insight.description}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs font-medium">
                                  {Math.round(insight.confidence * 100)}% confidence
                                </Badge>
                                <Badge variant="outline" className="text-xs capitalize font-medium">
                                  {insight.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
