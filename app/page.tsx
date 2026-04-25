import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Brain, LogIn, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarketplaceHome } from "@/components/marketplace/marketplace-home"

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

interface FeedbackRow {
  professional_id: string
  rating: number
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-card">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Aura Professional Marketplace</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Book Mental Health Sessions from Trusted Professionals</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find psychiatrists and psychologists, book paid sessions, share feedback, and join the community feed. The AI chatbot is still available via the floating button.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/auth/login">
                <Button size="lg" variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  let profile: Profile | null = null
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileData) {
    profile = {
      id: profileData.id,
      full_name: profileData.full_name,
      role: (profileData.role || "patient") as UserRole,
    }
  }

  let sessions: SessionItem[] = []
  let posts: FeedPost[] = []
  let feedbackRows: FeedbackRow[] = []
  let bookedSessionIds: string[] = []
  let feedbackTargets: Array<{ booking_id: string; session_id: string; professional_id: string }> = []

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("id, professional_id, title, start_time, duration_minutes, price_cents, mode, is_active")
    .eq("is_active", true)
    .order("start_time", { ascending: true })
    .limit(100)

  if (sessionsData) {
    sessions = sessionsData as SessionItem[]
  }

  const { data: postsData } = await supabase
    .from("social_posts")
    .select("id, author_id, content, post_type, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (postsData) {
    posts = postsData as FeedPost[]
  }

  const { data: feedbackData } = await supabase
    .from("session_feedback")
    .select("professional_id, rating")
    .limit(500)

  if (feedbackData) {
    feedbackRows = feedbackData as FeedbackRow[]
  }

  if ((profile?.role || "patient") === "patient") {
    const { data: bookingData } = await supabase
      .from("bookings")
      .select("id, session_id, status")
      .eq("patient_id", user.id)
      .in("status", ["confirmed", "completed"])

    if (bookingData && bookingData.length > 0) {
      const sessionIds = bookingData.map((b) => b.session_id)
      bookedSessionIds = [...new Set(sessionIds)]

      const { data: bookedSessions } = await supabase
        .from("sessions")
        .select("id, professional_id")
        .in("id", sessionIds)

      const { data: existingFeedback } = await supabase
        .from("session_feedback")
        .select("booking_id")
        .in("booking_id", bookingData.map((b) => b.id))

      const feedbackBookingSet = new Set((existingFeedback || []).map((f) => f.booking_id))
      const sessionToProfessional = new Map((bookedSessions || []).map((s) => [s.id, s.professional_id]))

      feedbackTargets = bookingData
        .filter((b) => !feedbackBookingSet.has(b.id))
        .map((b) => ({
          booking_id: b.id,
          session_id: b.session_id,
          professional_id: sessionToProfessional.get(b.session_id) || "",
        }))
        .filter((b) => Boolean(b.professional_id))
    }
  }

  const profileIds = new Set<string>()
  sessions.forEach((s) => profileIds.add(s.professional_id))
  posts.forEach((p) => profileIds.add(p.author_id))
  feedbackTargets.forEach((f) => profileIds.add(f.professional_id))

  const profilesById: Record<string, { full_name: string | null; role: UserRole }> = {}
  if (profileIds.size > 0) {
    const { data: relatedProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", [...profileIds])

    const relatedProfilesList = relatedProfiles || []
    relatedProfilesList.forEach((p) => {
      profilesById[p.id] = {
        full_name: p.full_name,
        role: (p.role || "patient") as UserRole,
      }
    })
  }

  const ratingsByProfessional = feedbackRows.reduce<Record<string, { average: number; count: number }>>((acc, row) => {
    if (!acc[row.professional_id]) {
      acc[row.professional_id] = { average: 0, count: 0 }
    }
    acc[row.professional_id].average += row.rating
    acc[row.professional_id].count += 1
    return acc
  }, {})

  Object.keys(ratingsByProfessional).forEach((key) => {
    const item = ratingsByProfessional[key]
    item.average = item.count > 0 ? item.average / item.count : 0
  })

  return (
    <MarketplaceHome
      userId={user.id}
      profile={profile}
      sessions={sessions}
      posts={posts}
      profilesById={profilesById}
      ratingsByProfessional={ratingsByProfessional}
      bookedSessionIds={bookedSessionIds}
      feedbackTargets={feedbackTargets}
    />
  )
}
