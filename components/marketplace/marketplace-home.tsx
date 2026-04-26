"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Clock3,
  CreditCard,
  HeartHandshake,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  Video,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type MarketplaceUser = {
  id: string
  email: string
  name: string
  role: string
} | null

type Session = {
  id: string
  professional_id: string
  session_date: string
  start_time: string
  duration_minutes: number
  price: number
  mode: "online" | "offline"
  focus: string
  meeting_url: string | null
  location: string | null
  status: "available" | "booked" | "cancelled" | "completed"
}

type Professional = {
  id: string
  user_id: string
  display_name: string
  profession_type: "psychiatrist" | "psychologist"
  city: string
  specialty: string
  bio: string
  years_experience: number
  consultation_fee: number
  payment_link: string | null
  avatar_url: string | null
  is_verified: boolean
  professional_sessions?: Session[]
  professional_reviews?: { rating: number; feedback: string }[]
  averageRating?: number
  reviewCount?: number
}

type Booking = {
  id: string
  status: "pending_payment" | "confirmed" | "completed" | "cancelled"
  payment_status: "pending" | "manual_pending" | "paid" | "failed" | "refunded"
  price_paid: number
  session_id: string
  professional_id: string
  professional_sessions: Session | null
  professional_profiles: Pick<Professional, "display_name" | "profession_type"> | null
}

type CommunityPost = {
  id: string
  post_type: "post" | "short"
  title: string
  body: string
  media_url: string | null
  created_at: string
  professional_profiles: Pick<Professional, "display_name" | "profession_type" | "avatar_url"> | null
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => void
  prefill?: {
    name?: string
    email?: string
  }
  theme?: {
    color?: string
  }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

const roleLabels: Record<string, string> = {
  patient: "Patient",
  psychiatrist: "Psychiatrist",
  psychologist: "Psychologist",
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price)
}

function formatDateTime(session: Session) {
  const date = new Date(`${session.session_date}T${session.start_time}`)
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function makeMeetingUrl(booking: Booking) {
  return (
    booking.professional_sessions?.meeting_url ||
    `https://meet.jit.si/psyspace-${booking.session_id}-${booking.id}`.replace(/[^a-zA-Z0-9:/.-]/g, "")
  )
}

async function loadRazorpayScript() {
  if (window.Razorpay) return true

  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function MarketplaceHome({ user }: { user: MarketplaceUser }) {
  const supabase = useMemo(() => createClient(), [])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [myProfessional, setMyProfessional] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [reviewBookingId, setReviewBookingId] = useState("")
  const [reviewRating, setReviewRating] = useState("5")
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [profileDraft, setProfileDraft] = useState({
    display_name: user?.name ?? "",
    profession_type: user?.role === "psychiatrist" ? "psychiatrist" : "psychologist",
    city: "",
    specialty: "",
    bio: "",
    years_experience: "1",
    consultation_fee: "1500",
    payment_link: "",
    avatar_url: "",
  })
  const [sessionDraft, setSessionDraft] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    start_time: "17:00",
    duration_minutes: "45",
    price: "1500",
    mode: "online",
    focus: "Initial consultation",
    meeting_url: "",
    location: "",
  })
  const [postDraft, setPostDraft] = useState({
    post_type: "post",
    title: "",
    body: "",
    media_url: "",
  })

  const isProfessionalUser = user?.role === "psychiatrist" || user?.role === "psychologist"

  const refreshMarketplace = async () => {
    setLoading(true)
    setError(null)

    const [{ data: professionalData, error: professionalError }, { data: postData, error: postError }] =
      await Promise.all([
        supabase
          .from("professional_profiles")
          .select("*, professional_sessions(*), professional_reviews(rating, feedback)")
          .order("created_at", { ascending: false }),
        supabase
          .from("community_posts")
          .select("*, professional_profiles(display_name, profession_type, avatar_url)")
          .order("created_at", { ascending: false })
          .limit(20),
      ])

    if (professionalError) setError(professionalError.message)
    if (postError) setError(postError.message)

    const normalizedProfessionals = ((professionalData ?? []) as Professional[]).map((professional) => {
      const reviews = professional.professional_reviews ?? []
      const averageRating =
        reviews.length > 0
          ? reviews.reduce((total, review) => total + Number(review.rating), 0) / reviews.length
          : undefined

      return {
        ...professional,
        professional_sessions: (professional.professional_sessions ?? []).sort((a, b) =>
          `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`),
        ),
        averageRating,
        reviewCount: reviews.length,
      }
    })

    setProfessionals(normalizedProfessionals)
    setPosts((postData ?? []) as CommunityPost[])

    if (user) {
      await refreshUserData()
    }

    setLoading(false)
  }

  const refreshUserData = async () => {
    if (!user) return

    const [{ data: professionalProfile }, { data: bookingData, error: bookingError }] = await Promise.all([
      supabase.from("professional_profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("bookings")
        .select("*, professional_sessions(*), professional_profiles(display_name, profession_type)")
        .order("created_at", { ascending: false }),
    ])

    if (professionalProfile) {
      const professional = professionalProfile as Professional
      setMyProfessional(professional)
      setProfileDraft({
        display_name: professional.display_name,
        profession_type: professional.profession_type,
        city: professional.city,
        specialty: professional.specialty,
        bio: professional.bio,
        years_experience: String(professional.years_experience),
        consultation_fee: String(professional.consultation_fee),
        payment_link: professional.payment_link ?? "",
        avatar_url: professional.avatar_url ?? "",
      })
    }

    if (bookingError) {
      setError(bookingError.message)
    } else {
      setBookings((bookingData ?? []) as Booking[])
    }
  }

  useEffect(() => {
    void refreshMarketplace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredProfessionals = professionals.filter((professional) => {
    const searchable = [
      professional.display_name,
      professional.profession_type,
      professional.city,
      professional.specialty,
      professional.bio,
    ]
      .join(" ")
      .toLowerCase()
    const matchesSearch = searchable.includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || professional.profession_type === roleFilter

    return matchesSearch && matchesRole
  })

  const availableSessions = (professional: Professional) =>
    (professional.professional_sessions ?? []).filter((session) => session.status === "available")

  const saveProfessionalProfile = async () => {
    if (!user || !isProfessionalUser) return

    setSaving(true)
    setError(null)
    setMessage(null)

    const payload = {
      user_id: user.id,
      display_name: profileDraft.display_name,
      profession_type: profileDraft.profession_type,
      city: profileDraft.city,
      specialty: profileDraft.specialty,
      bio: profileDraft.bio,
      years_experience: Number(profileDraft.years_experience) || 0,
      consultation_fee: Number(profileDraft.consultation_fee) || 0,
      payment_link: profileDraft.payment_link || null,
      avatar_url: profileDraft.avatar_url || null,
    }

    const { error: profileError } = await supabase
      .from("professional_profiles")
      .upsert(payload, { onConflict: "user_id" })

    if (profileError) {
      setError(profileError.message)
    } else {
      setMessage("Professional profile saved.")
      await refreshMarketplace()
    }

    setSaving(false)
  }

  const createSession = async () => {
    if (!myProfessional) {
      setError("Create your professional profile before publishing sessions.")
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    const { error: sessionError } = await supabase.from("professional_sessions").insert({
      professional_id: myProfessional.id,
      session_date: sessionDraft.session_date,
      start_time: sessionDraft.start_time,
      duration_minutes: Number(sessionDraft.duration_minutes) || 45,
      price: Number(sessionDraft.price) || 0,
      mode: sessionDraft.mode,
      focus: sessionDraft.focus,
      meeting_url: sessionDraft.meeting_url || null,
      location: sessionDraft.location || null,
      status: "available",
    })

    if (sessionError) {
      setError(sessionError.message)
    } else {
      setMessage("Session published.")
      await refreshMarketplace()
    }

    setSaving(false)
  }

  const deleteSession = async (sessionId: string) => {
    const { error: deleteError } = await supabase.from("professional_sessions").delete().eq("id", sessionId)
    if (deleteError) setError(deleteError.message)
    else await refreshMarketplace()
  }

  const createPost = async () => {
    if (!user || !myProfessional) {
      setError("Create your professional profile before posting.")
      return
    }

    const { error: postError } = await supabase.from("community_posts").insert({
      professional_id: myProfessional.id,
      author_id: user.id,
      post_type: postDraft.post_type,
      title: postDraft.title,
      body: postDraft.body,
      media_url: postDraft.media_url || null,
    })

    if (postError) {
      setError(postError.message)
    } else {
      setPostDraft({ post_type: "post", title: "", body: "", media_url: "" })
      setMessage("Post published.")
      await refreshMarketplace()
    }
  }

  const bookSession = async (session: Session) => {
    if (!user) {
      window.location.href = "/auth/login"
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)

    const response = await fetch("/api/marketplace/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    })
    const payload = await response.json()

    if (!response.ok) {
      setError(payload.error ?? "Unable to start booking.")
      setSaving(false)
      return
    }

    if (payload.manualPayment) {
      setMessage(payload.message)
      if (payload.paymentLink) window.open(payload.paymentLink, "_blank", "noopener,noreferrer")
      await refreshUserData()
      setSaving(false)
      return
    }

    const scriptLoaded = await loadRazorpayScript()
    if (!scriptLoaded || !window.Razorpay) {
      setError("Razorpay checkout could not load. Please try again.")
      setSaving(false)
      return
    }

    const checkout = new window.Razorpay({
      key: payload.keyId,
      amount: payload.amount,
      currency: payload.currency,
      name: payload.name,
      description: payload.description,
      order_id: payload.orderId,
      prefill: {
        name: user.name,
        email: user.email,
      },
      theme: {
        color: "#0ea5e9",
      },
      handler: async (paymentResponse) => {
        const verifyResponse = await fetch("/api/marketplace/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: payload.bookingId,
            ...paymentResponse,
          }),
        })
        const verifyPayload = await verifyResponse.json()
        if (!verifyResponse.ok) {
          setError(verifyPayload.error ?? "Payment verification failed.")
        } else {
          setMessage("Payment confirmed and session booked.")
          await refreshMarketplace()
        }
        setSaving(false)
      },
    })

    checkout.open()
  }

  const markBookingPaid = async (booking: Booking) => {
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ payment_status: "paid", status: "confirmed" })
      .eq("id", booking.id)

    if (bookingError) {
      setError(bookingError.message)
      return
    }

    await supabase.from("professional_sessions").update({ status: "booked" }).eq("id", booking.session_id)
    setMessage("Booking marked paid and confirmed.")
    await refreshMarketplace()
  }

  const joinSession = async (booking: Booking) => {
    await fetch("/api/marketplace/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, role: isProfessionalUser ? "professional" : "patient" }),
    })

    window.open(makeMeetingUrl(booking), "_blank", "noopener,noreferrer")
  }

  const submitReview = async () => {
    if (!user || !reviewBookingId) return

    const booking = bookings.find((item) => item.id === reviewBookingId)
    if (!booking) return

    const { error: reviewError } = await supabase.from("professional_reviews").insert({
      booking_id: booking.id,
      professional_id: booking.professional_id,
      patient_id: user.id,
      rating: Number(reviewRating),
      feedback: reviewFeedback,
    })

    if (reviewError) {
      setError(reviewError.message)
    } else {
      setMessage("Review submitted.")
      setReviewFeedback("")
      await refreshMarketplace()
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartHandshake className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none">Psyspace</p>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#sessions" className="hover:text-foreground">
              Sessions
            </a>
            <a href="#workspace" className="hover:text-foreground">
              Workspace
            </a>
            <a href="#community" className="hover:text-foreground">
              Community
            </a>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <Badge variant="secondary" className="hidden h-9 px-3 sm:inline-flex">
                <UserRound className="size-3.5" />
                {user.name} · {roleLabels[user.role] ?? "Member"}
              </Badge>
            ) : null}
            {user && (
              <Button asChild size="sm" variant="outline">
                <Link href="/chat">
                  <MessageCircle className="mr-2 size-4" />
                  Chat support
                </Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <section className="border-b border-border/70">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-6 lg:py-12">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="mb-4 h-8 w-fit border-primary/30 text-primary">
              {isProfessionalUser ? "Professional workspace" : "Patient workspace"}
            </Badge>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-balance md:text-6xl">
              {isProfessionalUser ? "Manage your practice, sessions, bookings, and content." : "Find care, book sessions, and manage your appointments."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              {isProfessionalUser
                ? "Keep your professional profile, availability, payments, attendance, posts, and patient feedback in one operational dashboard."
                : "Browse verified professionals, complete payment, join online sessions, review completed appointments, and use Aura chat as extra support."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-md">
                <a href="#sessions">
                  <Search className="mr-2 size-4" />
                  Find a session
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-md">
                <a href="#workspace">
                  <LayoutDashboard className="mr-2 size-4" />
                  Open workspace
                </a>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Supabase RLS protected
              </span>
              <span className="flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                Razorpay-ready
              </span>
              <span className="flex items-center gap-2">
                <Video className="size-4 text-primary" />
                Jitsi/meeting URL joins
              </span>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-md border border-border bg-card">
            <Image src="/placeholder.jpg" alt="Care workspace" fill className="object-cover opacity-30" priority />
            <div className="absolute inset-0 bg-gradient-to-br from-background/10 via-background/70 to-background" />
            <div className="relative grid h-full content-end gap-4 p-5">
              <div className="rounded-md border border-border bg-background/90 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Marketplace status</p>
                    <p className="text-sm text-muted-foreground">
                      {professionals.length} professionals · {bookings.length} visible bookings for this account
                    </p>
                  </div>
                  <Button asChild size="icon" className="rounded-md" aria-label="Open chatbot">
                    <Link href="/chat">
                      <MessageCircle className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["List", "Book", "Attend"].map((step) => (
                  <div key={step} className="rounded-md border border-border bg-background/85 p-3 backdrop-blur">
                    <p className="font-semibold">{step}</p>
                    <p className="text-xs text-muted-foreground">Live data</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-5 md:px-6">
        {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{error}</div>}
        {message && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
      </div>

      <section id="sessions" className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-primary">Browse sessions</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-normal">Available professionals</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search city, name, focus"
                className="h-10 pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Specialist" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All specialists</SelectItem>
                <SelectItem value="psychiatrist">Psychiatrists</SelectItem>
                <SelectItem value="psychologist">Psychologists</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading marketplace
          </div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
            No professionals are listed yet. Sign up as a psychiatrist or psychologist and publish the first session.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredProfessionals.map((professional) => (
              <Card key={professional.id} className="rounded-md">
                <CardHeader className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Image
                      src={professional.avatar_url || "/placeholder-user.jpg"}
                      alt={professional.display_name}
                      width={56}
                      height={56}
                      className="size-14 rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl">{professional.display_name}</CardTitle>
                      <CardDescription className="mt-1 capitalize">
                        {professional.profession_type} · {professional.city || "Remote"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Star className="size-3 fill-current" />
                      {professional.averageRating ? professional.averageRating.toFixed(1) : "New"} (
                      {professional.reviewCount ?? 0})
                    </Badge>
                    {professional.is_verified && (
                      <Badge variant="outline">
                        <BadgeCheck className="size-3" />
                        Verified
                      </Badge>
                    )}
                    <Badge variant="outline">From {formatPrice(Number(professional.consultation_fee))}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">{professional.bio || "No bio yet."}</p>
                  <p className="text-sm font-medium">{professional.specialty || "General consultation"}</p>
                  <div className="space-y-2">
                    {availableSessions(professional).length === 0 ? (
                      <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
                        No available sessions right now.
                      </p>
                    ) : (
                      availableSessions(professional).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{formatDateTime(session)}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.duration_minutes} min · {session.mode} · {formatPrice(Number(session.price))}
                            </p>
                          </div>
                          <Button size="sm" className="rounded-md" onClick={() => bookSession(session)} disabled={saving}>
                            {saving ? <Loader2 className="size-4 animate-spin" /> : "Book"}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section id="workspace" className="border-y border-border/70 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <Tabs defaultValue="bookings" className="gap-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-sm font-medium text-primary">Workspace</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-normal">Bookings, sessions, reviews, and posts</h2>
              </div>
              <TabsList className="h-10 rounded-md">
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="bookings">
              {!user ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center">
                  <p className="text-muted-foreground">Sign in to see your bookings and session links.</p>
                  <Button asChild className="mt-4 rounded-md">
                    <Link href="/auth/login">Sign in</Link>
                  </Button>
                </div>
              ) : bookings.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  Your bookings will appear here after checkout.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col justify-between gap-4 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center"
                    >
                      <div>
                        <p className="font-medium">{booking.professional_profiles?.display_name ?? "Professional"}</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.professional_sessions ? formatDateTime(booking.professional_sessions) : "Session"} ·{" "}
                          {formatPrice(Number(booking.price_paid))}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge variant="outline">{booking.status.replace("_", " ")}</Badge>
                          <Badge variant="secondary">{booking.payment_status.replace("_", " ")}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {isProfessionalUser && booking.payment_status !== "paid" && (
                          <Button variant="outline" className="rounded-md" onClick={() => markBookingPaid(booking)}>
                            <Check className="mr-2 size-4" />
                            Mark paid
                          </Button>
                        )}
                        <Button
                          className="rounded-md"
                          disabled={booking.status !== "confirmed"}
                          onClick={() => joinSession(booking)}
                        >
                          <Video className="mr-2 size-4" />
                          Join session
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="professional">
              {!isProfessionalUser ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
                  Professional tools unlock for psychiatrist and psychologist accounts.
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
                  <Card className="rounded-md">
                    <CardHeader>
                      <CardTitle>Professional profile</CardTitle>
                      <CardDescription>This profile is what patients browse before booking.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={profileDraft.display_name}
                          onChange={(event) =>
                            setProfileDraft((value) => ({ ...value, display_name: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={profileDraft.profession_type}
                            onValueChange={(profession_type) =>
                              setProfileDraft((value) => ({ ...value, profession_type }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="psychiatrist">Psychiatrist</SelectItem>
                              <SelectItem value="psychologist">Psychologist</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input
                            value={profileDraft.city}
                            onChange={(event) => setProfileDraft((value) => ({ ...value, city: event.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Specialty</Label>
                        <Input
                          value={profileDraft.specialty}
                          onChange={(event) =>
                            setProfileDraft((value) => ({ ...value, specialty: event.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea
                          value={profileDraft.bio}
                          onChange={(event) => setProfileDraft((value) => ({ ...value, bio: event.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Years</Label>
                          <Input
                            value={profileDraft.years_experience}
                            onChange={(event) =>
                              setProfileDraft((value) => ({ ...value, years_experience: event.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fee</Label>
                          <Input
                            value={profileDraft.consultation_fee}
                            onChange={(event) =>
                              setProfileDraft((value) => ({ ...value, consultation_fee: event.target.value }))
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Manual payment link</Label>
                        <Input
                          value={profileDraft.payment_link}
                          onChange={(event) =>
                            setProfileDraft((value) => ({ ...value, payment_link: event.target.value }))
                          }
                          placeholder="Razorpay/Stripe/UPI link"
                        />
                      </div>
                      <Button className="w-full rounded-md" onClick={saveProfessionalProfile} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <BadgeCheck className="mr-2 size-4" />}
                        Save profile
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="rounded-md">
                      <CardHeader>
                        <CardTitle>Publish session</CardTitle>
                        <CardDescription>Add availability, price, mode, and join details.</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2">
                        <Input
                          type="date"
                          value={sessionDraft.session_date}
                          onChange={(event) =>
                            setSessionDraft((value) => ({ ...value, session_date: event.target.value }))
                          }
                        />
                        <Input
                          type="time"
                          value={sessionDraft.start_time}
                          onChange={(event) =>
                            setSessionDraft((value) => ({ ...value, start_time: event.target.value }))
                          }
                        />
                        <Input
                          value={sessionDraft.duration_minutes}
                          onChange={(event) =>
                            setSessionDraft((value) => ({ ...value, duration_minutes: event.target.value }))
                          }
                          placeholder="Duration minutes"
                        />
                        <Input
                          value={sessionDraft.price}
                          onChange={(event) => setSessionDraft((value) => ({ ...value, price: event.target.value }))}
                          placeholder="Price"
                        />
                        <Input
                          value={sessionDraft.focus}
                          onChange={(event) => setSessionDraft((value) => ({ ...value, focus: event.target.value }))}
                          placeholder="Focus"
                        />
                        <Select
                          value={sessionDraft.mode}
                          onValueChange={(mode) => setSessionDraft((value) => ({ ...value, mode }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="offline">Offline</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          value={sessionDraft.meeting_url}
                          onChange={(event) =>
                            setSessionDraft((value) => ({ ...value, meeting_url: event.target.value }))
                          }
                          placeholder="Meeting URL"
                        />
                        <Input
                          value={sessionDraft.location}
                          onChange={(event) => setSessionDraft((value) => ({ ...value, location: event.target.value }))}
                          placeholder="Offline location"
                        />
                        <Button className="rounded-md md:col-span-2" onClick={createSession} disabled={saving}>
                          <Plus className="mr-2 size-4" />
                          Publish session
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="space-y-3">
                      {(professionals.find((item) => item.id === myProfessional?.id)?.professional_sessions ?? []).map(
                        (session) => (
                          <div
                            key={session.id}
                            className="flex flex-col justify-between gap-4 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-medium">{session.focus}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateTime(session)} · {formatPrice(Number(session.price))} · {session.status}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="rounded-md"
                              onClick={() => deleteSession(session.id)}
                              aria-label="Delete session"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="feedback">
              <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
                <Card className="rounded-md">
                  <CardHeader>
                    <CardTitle>Review a session</CardTitle>
                    <CardDescription>Reviews are stored only for paid, confirmed bookings.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={reviewBookingId} onValueChange={setReviewBookingId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a booking" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookings
                          .filter((booking) => booking.status === "confirmed" && booking.payment_status === "paid")
                          .map((booking) => (
                            <SelectItem key={booking.id} value={booking.id}>
                              {booking.professional_profiles?.display_name ?? "Professional"}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Select value={reviewRating} onValueChange={setReviewRating}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <SelectItem key={rating} value={String(rating)}>
                            {rating} stars
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={reviewFeedback}
                      onChange={(event) => setReviewFeedback(event.target.value)}
                      placeholder="Share what helped and what could improve."
                    />
                    <Button className="w-full rounded-md" onClick={submitReview}>
                      Submit review
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-md">
                  <CardHeader>
                    <CardTitle>Social post tools</CardTitle>
                    <CardDescription>Professionals can publish posts or short-form guidance.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select
                      value={postDraft.post_type}
                      onValueChange={(post_type) => setPostDraft((value) => ({ ...value, post_type }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="post">Post</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={postDraft.title}
                      onChange={(event) => setPostDraft((value) => ({ ...value, title: event.target.value }))}
                      placeholder="Title"
                    />
                    <Textarea
                      value={postDraft.body}
                      onChange={(event) => setPostDraft((value) => ({ ...value, body: event.target.value }))}
                      placeholder="Post body or short caption"
                    />
                    <Input
                      value={postDraft.media_url}
                      onChange={(event) => setPostDraft((value) => ({ ...value, media_url: event.target.value }))}
                      placeholder="Optional media URL"
                    />
                    <Button className="w-full rounded-md" onClick={createPost} disabled={!myProfessional}>
                      <Send className="mr-2 size-4" />
                      Publish
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section id="community" className="border-t border-border/70 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
          <p className="text-sm font-medium text-primary">Community</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-normal">Posts and shorts</h2>
          {posts.length === 0 ? (
            <div className="mt-5 rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
              Professional posts and shorts will appear here.
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Card key={post.id} className="rounded-md">
                  <CardHeader>
                    <CardDescription className="capitalize">
                      {post.professional_profiles?.display_name ?? "Professional"} · {post.post_type}
                    </CardDescription>
                    <CardTitle className="text-xl">{post.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {post.media_url && (
                      <a
                        href={post.media_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-4 flex h-28 items-center justify-center rounded-md border border-border bg-muted/40"
                      >
                        <Play className="size-6 text-primary" />
                      </a>
                    )}
                    <p className="text-sm leading-6 text-muted-foreground">{post.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground md:px-6">
        <div className="flex flex-col justify-between gap-3 border-t border-border pt-6 md:flex-row">
          <p>Psyspace supports professional mental health booking and AI-guided wellness.</p>
          <p>In crisis, call 988 in the US or your local emergency number immediately.</p>
        </div>
      </footer>

      <Link
        href="/chat"
        className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-2xl hover:bg-primary/90"
        aria-label="Open Aura chatbot"
      >
        <MessageCircle className="size-6" />
      </Link>
    </main>
  )
}
