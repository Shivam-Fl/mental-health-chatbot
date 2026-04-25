"use client"

import { useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CalendarClock, Star, BadgeIndianRupee, Users, PlayCircle } from "lucide-react"

type UserRole = "patient" | "psychiatrist" | "psychologist"

interface Profile {
  id: string
  full_name: string | null
  role: UserRole
}

interface SessionItem {
  id: string
  professional_id: string
  title: string
  start_time: string
  duration_minutes: number
  price_cents: number
  mode: "online" | "offline"
  is_active: boolean
}

interface FeedPost {
  id: string
  author_id: string
  content: string
  post_type: "post" | "short"
  created_at: string
}

interface RatingSummary {
  average: number
  count: number
}

interface FeedbackTarget {
  booking_id: string
  session_id: string
  professional_id: string
}

interface MarketplaceHomeProps {
  userId: string | null
  profile: Profile | null
  sessions: SessionItem[]
  posts: FeedPost[]
  profilesById: Record<string, { full_name: string | null; role: UserRole }>
  ratingsByProfessional: Record<string, RatingSummary>
  bookedSessionIds: string[]
  feedbackTargets: FeedbackTarget[]
}

const DEFAULT_SESSION_TITLE = "1:1 Support Session"
const PENDING_PAYMENT_PROVIDER = "pending_integration"

function formatINR(cents: number) {
  return `₹${(cents / 100).toFixed(0)}`
}

export function MarketplaceHome({
  userId,
  profile,
  sessions,
  posts,
  profilesById,
  ratingsByProfessional,
  bookedSessionIds,
  feedbackTargets,
}: MarketplaceHomeProps) {
  const router = useRouter()
  const supabase = createClient()

  const [sessionForm, setSessionForm] = useState({
    title: "",
    start_time: "",
    duration_minutes: "45",
    price_inr: "800",
    mode: "online" as "online" | "offline",
  })
  const [postContent, setPostContent] = useState("")
  const [postType, setPostType] = useState<"post" | "short">("post")
  const [feedback, setFeedback] = useState<Record<string, { rating: string; comment: string }>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isProfessional = profile?.role === "psychiatrist" || profile?.role === "psychologist"
  const sessionLookup = useMemo(() => new Set(bookedSessionIds), [bookedSessionIds])

  const requireLogin = () => {
    router.push("/auth/login")
  }

  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId || !isProfessional) return requireLogin()

    setBusyKey("create-session")
    setError(null)
    const parsedDuration = Number.parseInt(sessionForm.duration_minutes, 10)
    const parsedPriceInr = Number.parseInt(sessionForm.price_inr, 10)
    if (Number.isNaN(parsedDuration) || parsedDuration < 15 || parsedDuration > 180) {
      setError("Duration must be between 15 and 180 minutes.")
      setBusyKey(null)
      return
    }
    if (Number.isNaN(parsedPriceInr) || parsedPriceInr <= 0) {
      setError("Price must be a valid positive amount.")
      setBusyKey(null)
      return
    }

    const { error } = await supabase.from("sessions").insert({
      professional_id: userId,
      title: sessionForm.title.trim() || DEFAULT_SESSION_TITLE,
      start_time: new Date(sessionForm.start_time).toISOString(),
      duration_minutes: parsedDuration,
      price_cents: parsedPriceInr * 100,
      mode: sessionForm.mode,
      is_active: true,
    })

    if (error) {
      setError(error.message)
      setBusyKey(null)
      return
    }

    setSessionForm({ title: "", start_time: "", duration_minutes: "45", price_inr: "800", mode: "online" })
    setBusyKey(null)
    router.refresh()
  }

  const handleBook = async (sessionId: string) => {
    if (!userId || !profile) return requireLogin()
    if (profile.role !== "patient") {
      setError("Only patients can book sessions.")
      return
    }

    setBusyKey(`book-${sessionId}`)
    setError(null)
    const session = sessions.find((s) => s.id === sessionId)
    if (!session) {
      setError("Session is no longer available. Please refresh and try again.")
      setBusyKey(null)
      return
    }

    const { error } = await supabase.from("bookings").insert({
      session_id: sessionId,
      patient_id: userId,
      status: "confirmed",
      payment_status: "pending",
      amount_cents: session.price_cents,
      payment_provider: PENDING_PAYMENT_PROVIDER,
    })

    if (error) {
      setError(error.message)
      setBusyKey(null)
      return
    }

    setBusyKey(null)
    router.refresh()
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!userId || !isProfessional) return

    setBusyKey(`delete-${sessionId}`)
    setError(null)

    const { error } = await supabase
      .from("sessions")
      .update({ is_active: false })
      .eq("id", sessionId)
      .eq("professional_id", userId)

    if (error) {
      setError(error.message)
      setBusyKey(null)
      return
    }

    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("session_id", sessionId)
      .neq("status", "completed")

    if (bookingUpdateError) {
      setError(bookingUpdateError.message)
      setBusyKey(null)
      return
    }

    setBusyKey(null)
    router.refresh()
  }

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault()
    if (!userId) return requireLogin()

    setBusyKey("create-post")
    setError(null)

    const { error } = await supabase.from("social_posts").insert({
      author_id: userId,
      content: postContent.trim(),
      post_type: postType,
    })

    if (error) {
      setError(error.message)
      setBusyKey(null)
      return
    }

    setPostContent("")
    setBusyKey(null)
    router.refresh()
  }

  const handleFeedbackSubmit = async (bookingId: string, professionalId: string) => {
    if (!userId) return requireLogin()

    const value = feedback[bookingId]
    if (!value?.rating) {
      setError("Please choose a rating between 1 and 5.")
      return
    }
    const rating = Number.parseInt(value.rating, 10)
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      setError("Please choose a rating between 1 and 5.")
      return
    }
    const commentValue = value?.comment || ""
    const trimmedComment = commentValue.trim() ? commentValue.trim() : null

    setBusyKey(`feedback-${bookingId}`)
    setError(null)

    const { error } = await supabase.from("session_feedback").insert({
      booking_id: bookingId,
      professional_id: professionalId,
      patient_id: userId,
      rating,
      comment: trimmedComment,
    })

    if (error) {
      setError(error.message)
      setBusyKey(null)
      return
    }

    setBusyKey(null)
    router.refresh()
  }

  const upcomingSessions = sessions.filter((s) => s.is_active)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Mental Health Professional Marketplace</h1>
            <p className="text-muted-foreground mt-2">
              Book trusted psychiatrists and psychologists, and connect with the community.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Default Experience</Badge>
            <Badge>{profile ? profile.role : "guest"}</Badge>
          </div>
        </div>

        {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-md">{error}</p>}

        {isProfessional && (
          <Card>
            <CardHeader>
              <CardTitle>List a New Session</CardTitle>
              <CardDescription>Create paid slots for patients to book.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSession} className="grid md:grid-cols-5 gap-3">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="session-title">Title</Label>
                  <Input
                    id="session-title"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Anxiety support session"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session-start">Date & Time</Label>
                  <Input
                    id="session-start"
                    type="datetime-local"
                    value={sessionForm.start_time}
                    onChange={(e) => setSessionForm((p) => ({ ...p, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={15}
                    max={180}
                    value={sessionForm.duration_minutes}
                    onChange={(e) => setSessionForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (INR)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={1}
                    step={1}
                    value={sessionForm.price_inr}
                    onChange={(e) => setSessionForm((p) => ({ ...p, price_inr: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mode">Mode</Label>
                  <select
                    id="mode"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={sessionForm.mode}
                    onChange={(e) => setSessionForm((p) => ({ ...p, mode: e.target.value as "online" | "offline" }))}
                  >
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className="md:col-span-5 flex justify-end">
                  <Button type="submit" disabled={busyKey === "create-session"}>
                    Publish Session
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Available Sessions
            </CardTitle>
            <CardDescription>Browse and book paid sessions.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingSessions.length === 0 && <p className="text-muted-foreground">No sessions listed yet.</p>}
            {upcomingSessions.map((session) => {
              const owner = profilesById[session.professional_id]
              const rating = ratingsByProfessional[session.professional_id]
              const isBooked = sessionLookup.has(session.id)
              const isOwn = userId === session.professional_id

              return (
                <Card key={session.id} className="border-border/70">
                  <CardHeader>
                    <CardTitle className="text-lg">{session.title}</CardTitle>
                    <CardDescription>
                      {(owner?.full_name || "Professional")} • {owner?.role || "specialist"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <CalendarClock className="h-4 w-4" /> {new Date(session.start_time).toLocaleString()}
                    </p>
                    <p className="text-muted-foreground">Duration: {session.duration_minutes} min • {session.mode}</p>
                    <p className="flex items-center gap-2 font-medium">
                      <BadgeIndianRupee className="h-4 w-4" /> {formatINR(session.price_cents)}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Star className="h-4 w-4" /> {rating ? `${rating.average.toFixed(1)} (${rating.count})` : "No ratings yet"}
                    </p>
                    <div className="pt-2 flex gap-2">
                      {!isOwn && (
                        <Button
                          className="flex-1"
                          disabled={isBooked || busyKey === `book-${session.id}` || !userId || profile?.role !== "patient"}
                          onClick={() => handleBook(session.id)}
                        >
                          {isBooked ? "Booked" : "Book Now"}
                        </Button>
                      )}
                      {isOwn && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          disabled={busyKey === `delete-${session.id}`}
                          onClick={() => handleDeleteSession(session.id)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
        </Card>

        {feedbackTargets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rate Your Sessions
              </CardTitle>
              <CardDescription>Share your experience to help other users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {feedbackTargets.map((target) => {
                const prof = profilesById[target.professional_id]
                return (
                  <div key={target.booking_id} className="border rounded-lg p-4 space-y-3">
                    <p className="font-medium">{prof?.full_name || "Professional"}</p>
                    <div className="grid md:grid-cols-6 gap-3">
                      <select
                        className="md:col-span-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={feedback[target.booking_id]?.rating || ""}
                        onChange={(e) =>
                          setFeedback((prev) => ({
                            ...prev,
                            [target.booking_id]: {
                              rating: e.target.value,
                              comment: prev[target.booking_id]?.comment || "",
                            },
                          }))
                        }
                      >
                        <option value="">Rating</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                      <Textarea
                        className="md:col-span-4"
                        value={feedback[target.booking_id]?.comment || ""}
                        onChange={(e) =>
                          setFeedback((prev) => ({
                            ...prev,
                            [target.booking_id]: {
                              rating: prev[target.booking_id]?.rating || "",
                              comment: e.target.value,
                            },
                          }))
                        }
                        placeholder="Write your feedback"
                      />
                      <Button
                        className="md:col-span-1"
                        disabled={busyKey === `feedback-${target.booking_id}`}
                        onClick={() => handleFeedbackSubmit(target.booking_id, target.professional_id)}
                      >
                        Submit
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Community Post
              </CardTitle>
              <CardDescription>Share updates as a post or short.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePost} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="post-type">Type</Label>
                  <select
                    id="post-type"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as "post" | "short")}
                  >
                    <option value="post">Post</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your tip, thought, or support message"
                  maxLength={1000}
                  required
                />
                <Button type="submit" className="w-full" disabled={!userId || busyKey === "create-post" || postContent.trim().length === 0}>
                  Publish
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" /> Social Feed
              </CardTitle>
              <CardDescription>Recent posts and shorts from the community.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {posts.length === 0 && <p className="text-muted-foreground">No posts yet.</p>}
              {posts.map((post) => {
                const author = profilesById[post.author_id]
                return (
                  <div key={post.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{author?.full_name || "Community Member"}</p>
                      <Badge variant={post.post_type === "short" ? "secondary" : "default"}>{post.post_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
