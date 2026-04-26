"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  Calendar,
  Clock,
  CreditCard,
  Filter,
  Loader2,
  MapPin,
  Search,
  Star,
  Video,
  X,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type PatientDashboardProps = {
  user: { id: string; email: string; name: string }
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
}

function sessionTime(session: any) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(`${session.session_date}T${session.start_time}`),
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`size-7 transition-colors ${
              star <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

async function loadRazorpay() {
  if ((window as any).Razorpay) return true
  return new Promise<boolean>((resolve) => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function PatientDashboard({ user }: PatientDashboardProps) {
  const supabase = useMemo(() => createClient(), [])
  const [professionals, setProfessionals] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  // Filters
  const [query, setQuery] = useState("")
  const [filterMode, setFilterMode] = useState("all")
  const [filterSort, setFilterSort] = useState("rating")

  // Detail sheet
  const [selected, setSelected] = useState<any>(null)

  // Review
  const [reviewBookingId, setReviewBookingId] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState("")

  const showMessage = (text: string, type: "success" | "error" = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const refresh = async () => {
    setLoading(true)
    const [{ data: profData }, { data: bookData }] = await Promise.all([
      supabase
        .from("professional_profiles")
        .select("*, professional_sessions(*), professional_reviews(rating, feedback, created_at)")
        .eq("is_verified", true)
        .eq("verification_status", "approved")
        .order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("*, professional_profiles(display_name), professional_sessions(*)")
        .eq("patient_id", user.id)
        .order("created_at", { ascending: false }),
    ])
    setProfessionals(
      (profData ?? []).map((p: any) => {
        const reviews = p.professional_reviews ?? []
        const avg = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + Number(r.rating), 0) / reviews.length : null
        return { ...p, averageRating: avg, reviewCount: reviews.length }
      }),
    )
    setBookings(bookData ?? [])
    setLoading(false)
  }

  useEffect(() => { void refresh() }, []) // eslint-disable-line

  const filtered = professionals
    .filter((p) => {
      const text = [p.display_name, p.city, p.specialty, p.bio, p.profession_type].join(" ").toLowerCase()
      const matchQuery = !query || text.includes(query.toLowerCase())
      const matchMode =
        filterMode === "all" ||
        (p.professional_sessions ?? []).some((s: any) => s.status === "available" && s.mode === filterMode)
      return matchQuery && matchMode
    })
    .sort((a, b) => {
      if (filterSort === "rating") return (b.averageRating ?? 0) - (a.averageRating ?? 0)
      if (filterSort === "fee_low") return Number(a.consultation_fee) - Number(b.consultation_fee)
      if (filterSort === "fee_high") return Number(b.consultation_fee) - Number(a.consultation_fee)
      return 0
    })

  const bookSession = async (session: any) => {
    setBusy(true)
    setMessage(null)
    const response = await fetch("/api/marketplace/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    })
    const payload = await response.json()
    if (!response.ok) { showMessage(payload.error ?? "Could not start booking.", "error"); setBusy(false); return }

    if (payload.manualPayment) {
      showMessage(payload.message)
      if (payload.paymentLink) window.open(payload.paymentLink, "_blank", "noopener,noreferrer")
      await refresh(); setBusy(false); return
    }

    if (!(await loadRazorpay()) || !(window as any).Razorpay) {
      showMessage("Payment checkout could not load.", "error"); setBusy(false); return
    }
    new (window as any).Razorpay({
      key: payload.keyId, amount: payload.amount, currency: payload.currency,
      name: payload.name, description: payload.description, order_id: payload.orderId,
      prefill: { name: user.name, email: user.email },
      handler: async (resp: any) => {
        await fetch("/api/marketplace/payments/verify", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: payload.bookingId, ...resp }),
        })
        showMessage("Booking confirmed! Your session is scheduled.")
        await refresh(); setBusy(false)
      },
    }).open()
  }

  const confirmManualPayment = async (booking: any) => {
    setBusy(true)
    setMessage(null)
    const res = await fetch("/api/marketplace/payments/confirm-manual", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id }),
    })
    const data = await res.json()
    if (!res.ok) showMessage(data.error ?? "Could not confirm payment.", "error")
    else showMessage("Payment confirmed! Your session is now booked.")
    setBusy(false)
    await refresh()
  }

  const joinSession = async (booking: any) => {
    await fetch("/api/marketplace/attendance", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, role: "patient" }),
    })
    const url = booking.professional_sessions?.meeting_url
      || `https://meet.jit.si/psyspace-${booking.session_id}-${booking.id}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const submitReview = async () => {
    const booking = bookings.find((b) => b.id === reviewBookingId)
    if (!booking) return
    const { error } = await supabase.from("professional_reviews").insert({
      booking_id: booking.id,
      professional_id: booking.professional_id,
      patient_id: user.id,
      rating: reviewRating,
      feedback: reviewText,
    })
    if (error) showMessage(error.message, "error")
    else {
      showMessage("Review submitted. Thank you!")
      setReviewText(""); setReviewBookingId(""); setReviewRating(5)
      await refresh()
    }
  }

  const upcomingBookings = bookings.filter((b) => b.status === "confirmed" && b.payment_status === "paid")
  const pendingBookings = bookings.filter((b) => b.payment_status !== "paid" && b.status !== "cancelled")
  const pastBookings = bookings.filter((b) => b.status === "completed")
  const reviewableBookings = upcomingBookings.filter((b) => b.status === "confirmed" && b.payment_status === "paid")

  return (
    <div className="space-y-6">
      {/* Global message */}
      {message && (
        <div className={`rounded-xl border p-3 text-sm font-medium flex items-center justify-between ${
          message.type === "success"
            ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}>
          {message.text}
          <button onClick={() => setMessage(null)}><X className="size-4" /></button>
        </div>
      )}

      <Tabs defaultValue="browse">
        <TabsList className="h-10 rounded-xl">
          <TabsTrigger value="browse" className="rounded-lg">Find a Professional</TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-lg gap-1.5">
            My Appointments
            {upcomingBookings.length > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {upcomingBookings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg">Leave a Review</TabsTrigger>
        </TabsList>

        {/* ── BROWSE TAB ── */}
        <TabsContent value="browse" className="mt-6 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, city, specialty…"
                className="pl-9 rounded-xl"
              />
            </div>
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-40 rounded-xl">
                <Filter className="size-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="online">Online only</SelectItem>
                <SelectItem value="offline">In-person only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSort} onValueChange={setFilterSort}>
              <SelectTrigger className="w-44 rounded-xl">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Sort: Top rated</SelectItem>
                <SelectItem value="fee_low">Sort: Price low → high</SelectItem>
                <SelectItem value="fee_high">Sort: Price high → low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" /> Loading professionals…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <Search className="size-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No professionals match your search.</p>
              <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((pro) => {
                const available = (pro.professional_sessions ?? []).filter((s: any) => s.status === "available")
                return (
                  <Card
                    key={pro.id}
                    className="rounded-xl cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                    onClick={() => setSelected(pro)}
                  >
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <Image
                          src={pro.avatar_url || "/placeholder-user.jpg"}
                          alt={pro.display_name}
                          width={56}
                          height={56}
                          className="size-14 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base truncate">{pro.display_name}</h3>
                            {pro.is_verified && <BadgeCheck className="size-4 text-primary shrink-0" />}
                          </div>
                          <p className="text-sm capitalize text-muted-foreground">
                            {pro.profession_type} · {pro.city || "Remote"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{pro.bio || "No bio provided."}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {pro.averageRating != null && (
                          <span className="flex items-center gap-1 text-amber-500 font-medium">
                            <Star className="size-3.5 fill-amber-400" />
                            {pro.averageRating.toFixed(1)} ({pro.reviewCount})
                          </span>
                        )}
                        <span className="text-muted-foreground">From {money(Number(pro.consultation_fee))}</span>
                        <Badge variant="secondary">{available.length} slots open</Badge>
                      </div>
                      <Button className="w-full rounded-xl" size="sm" onClick={(e) => { e.stopPropagation(); setSelected(pro) }}>
                        View & Book
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── APPOINTMENTS TAB ── */}
        <TabsContent value="appointments" className="mt-6 space-y-6">
          {/* Upcoming */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="size-4 text-primary" /> Upcoming Sessions ({upcomingBookings.length})
            </h3>
            {upcomingBookings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
                No upcoming sessions. Browse professionals to book one!
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div key={b.id} className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">{b.professional_profiles?.display_name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {b.professional_sessions ? sessionTime(b.professional_sessions) : "—"} ·{" "}
                        {b.professional_sessions?.duration_minutes} min · {b.professional_sessions?.mode}
                      </p>
                      <Badge variant="default" className="mt-2">Confirmed</Badge>
                    </div>
                    <Button className="rounded-xl gap-2 shrink-0" onClick={() => joinSession(b)}>
                      <Video className="size-4" /> Join Session
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Payment */}
          {pendingBookings.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="size-4 text-amber-500" /> Pending Payment ({pendingBookings.length})
              </h3>
              <div className="space-y-3">
                {pendingBookings.map((b) => {
                  const isManual = b.payment_status === "manual_pending"
                  const prof = b.professional_profiles
                  return (
                    <div key={b.id} className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                      <div>
                        <p className="font-semibold">{prof?.display_name}</p>
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          {b.professional_sessions ? sessionTime(b.professional_sessions) : "—"}
                        </p>
                        <Badge variant="secondary" className="mt-2 capitalize">
                          {isManual ? "Awaiting manual payment" : b.payment_status.replace("_", " ")}
                        </Badge>
                      </div>
                      {isManual && (
                        <div className="flex flex-wrap gap-2">
                          {prof?.payment_link && (
                            <Button size="sm" className="rounded-lg" asChild>
                              <a href={prof.payment_link} target="_blank" rel="noreferrer">
                                <CreditCard className="size-3.5 mr-1.5" /> Pay via UPI / Link
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => confirmManualPayment(b)}
                            disabled={busy}
                          >
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : "✓ I've Paid — Confirm"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Past */}
          {pastBookings.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" /> Past Sessions ({pastBookings.length})
              </h3>
              <div className="space-y-3">
                {pastBookings.map((b) => (
                  <div key={b.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">{b.professional_profiles?.display_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {b.professional_sessions ? sessionTime(b.professional_sessions) : "—"}
                      </p>
                    </div>
                    <Badge variant="outline">Completed</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bookings.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <Calendar className="size-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No appointments yet.</p>
              <p className="text-sm mt-1">Find a professional and book your first session.</p>
            </div>
          )}
        </TabsContent>

        {/* ── REVIEWS TAB ── */}
        <TabsContent value="reviews" className="mt-6">
          <Card className="max-w-lg rounded-xl">
            <CardHeader>
              <CardTitle>Leave a Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviewableBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">You have no confirmed, paid sessions to review yet.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Session</Label>
                    <Select value={reviewBookingId} onValueChange={setReviewBookingId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select a session to review" />
                      </SelectTrigger>
                      <SelectContent>
                        {reviewableBookings.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.professional_profiles?.display_name} —{" "}
                            {b.professional_sessions ? sessionTime(b.professional_sessions) : "Session"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Your Rating</Label>
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Feedback</Label>
                    <Textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share what helped and what could be improved…"
                      rows={4}
                      className="rounded-xl"
                    />
                  </div>
                  <Button className="w-full rounded-xl" onClick={submitReview} disabled={!reviewBookingId}>
                    Submit Review
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Professional Detail Sheet ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative ml-auto h-full w-full max-w-lg overflow-y-auto bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-5 py-4">
              <h2 className="font-bold text-lg">Professional Profile</h2>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setSelected(null)}>
                <X className="size-5" />
              </Button>
            </div>

            <div className="p-5 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <Image
                  src={selected.avatar_url || "/placeholder-user.jpg"}
                  alt={selected.display_name}
                  width={80}
                  height={80}
                  className="size-20 rounded-2xl object-cover shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold">{selected.display_name}</h3>
                    {selected.is_verified && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        <BadgeCheck className="size-3 mr-1" /> Verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm capitalize text-muted-foreground mt-1">
                    {selected.profession_type}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {selected.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3.5" /> {selected.city}
                      </span>
                    )}
                    {selected.averageRating != null && (
                      <span className="flex items-center gap-1 text-amber-500 font-medium">
                        <Star className="size-3.5 fill-amber-400" />
                        {selected.averageRating.toFixed(1)} ({selected.reviewCount} reviews)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Experience</p>
                  <p className="font-semibold mt-1">{selected.years_experience ?? "—"} years</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Base Fee</p>
                  <p className="font-semibold mt-1">{money(Number(selected.consultation_fee))}</p>
                </div>
              </div>

              {selected.specialty && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Specialty</p>
                  <p className="text-sm">{selected.specialty}</p>
                </div>
              )}

              {selected.bio && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">About</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{selected.bio}</p>
                </div>
              )}

              {/* Available Slots */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Available Sessions
                </p>
                {(selected.professional_sessions ?? []).filter((s: any) => s.status === "available").length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    No available slots right now. Check back later.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(selected.professional_sessions ?? [])
                      .filter((s: any) => s.status === "available")
                      .sort((a: any, b: any) =>
                        `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`),
                      )
                      .map((session: any) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                        >
                          <div>
                            <p className="font-medium text-sm">{sessionTime(session)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {session.duration_minutes} min · {session.mode} · {money(Number(session.price))}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            className="rounded-lg shrink-0"
                            disabled={busy}
                            onClick={() => bookSession(session)}
                          >
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : (
                              <><CreditCard className="size-3.5 mr-1.5" /> Book</>
                            )}
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Recent Reviews */}
              {selected.professional_reviews && selected.professional_reviews.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    Patient Reviews
                  </p>
                  <div className="space-y-3">
                    {selected.professional_reviews.slice(0, 3).map((r: any, i: number) => (
                      <div key={i} className="rounded-xl bg-muted/50 p-3 space-y-1">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`size-3 ${idx < r.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                            />
                          ))}
                        </div>
                        {r.feedback && <p className="text-sm text-muted-foreground">{r.feedback}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
