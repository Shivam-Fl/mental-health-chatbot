"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { CreditCard, Loader2, Search, Star, Video } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type PatientDashboardProps = {
  user: {
    id: string
    email: string
    name: string
  }
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
}

function sessionTime(session: any) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(`${session.session_date}T${session.start_time}`),
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
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reviewBookingId, setReviewBookingId] = useState("")
  const [reviewText, setReviewText] = useState("")
  const [rating, setRating] = useState("5")

  const refresh = async () => {
    setLoading(true)
    const [{ data: professionalData }, { data: bookingData }] = await Promise.all([
      supabase
        .from("professional_profiles")
        .select("*, professional_sessions(*), professional_reviews(rating)")
        .eq("is_verified", true)
        .eq("verification_status", "approved")
        .order("created_at", { ascending: false }),
      supabase
        .from("bookings")
        .select("*, professional_profiles(display_name), professional_sessions(*)")
        .order("created_at", { ascending: false }),
    ])
    setProfessionals(professionalData ?? [])
    setBookings(bookingData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredProfessionals = professionals.filter((professional) =>
    [professional.display_name, professional.city, professional.specialty, professional.bio]
      .join(" ")
      .toLowerCase()
      .includes(query.toLowerCase()),
  )

  const bookSession = async (session: any) => {
    setBusy(true)
    setMessage(null)
    const response = await fetch("/api/marketplace/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: session.id }),
    })
    const payload = await response.json()

    if (!response.ok) {
      setMessage(payload.error ?? "Could not start booking.")
      setBusy(false)
      return
    }

    if (payload.manualPayment) {
      setMessage(payload.message)
      if (payload.paymentLink) window.open(payload.paymentLink, "_blank", "noopener,noreferrer")
      await refresh()
      setBusy(false)
      return
    }

    if (!(await loadRazorpay()) || !(window as any).Razorpay) {
      setMessage("Payment checkout could not load.")
      setBusy(false)
      return
    }

    new (window as any).Razorpay({
      key: payload.keyId,
      amount: payload.amount,
      currency: payload.currency,
      name: payload.name,
      description: payload.description,
      order_id: payload.orderId,
      prefill: { name: user.name, email: user.email },
      handler: async (paymentResponse: any) => {
        await fetch("/api/marketplace/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: payload.bookingId, ...paymentResponse }),
        })
        setMessage("Booking confirmed.")
        await refresh()
        setBusy(false)
      },
    }).open()
  }

  const joinSession = async (booking: any) => {
    await fetch("/api/marketplace/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, role: "patient" }),
    })
    window.open(
      booking.professional_sessions?.meeting_url || `https://meet.jit.si/aura-care-${booking.session_id}-${booking.id}`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  const submitReview = async () => {
    const booking = bookings.find((item) => item.id === reviewBookingId)
    if (!booking) return
    const { error } = await supabase.from("professional_reviews").insert({
      booking_id: booking.id,
      professional_id: booking.professional_id,
      patient_id: user.id,
      rating: Number(rating),
      feedback: reviewText,
    })
    setMessage(error ? error.message : "Review submitted.")
    if (!error) {
      setReviewText("")
      await refresh()
    }
  }

  return (
    <div className="space-y-6">
      {message && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-lg">Confirmed sessions</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{bookings.filter((item) => item.status === "confirmed").length}</CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-lg">Available professionals</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{professionals.length}</CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-lg">Pending payments</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{bookings.filter((item) => item.payment_status !== "paid").length}</CardContent>
        </Card>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by specialty, city, or name" className="pl-9" />
          </div>

          {loading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading verified professionals
            </div>
          ) : (
            filteredProfessionals.map((professional) => {
              const reviews = professional.professional_reviews ?? []
              const average =
                reviews.length > 0
                  ? reviews.reduce((total: number, review: any) => total + Number(review.rating), 0) / reviews.length
                  : null
              return (
                <Card key={professional.id} className="rounded-md">
                  <CardContent className="grid gap-4 p-5 md:grid-cols-[72px_1fr]">
                    <Image src={professional.avatar_url || "/placeholder-user.jpg"} alt={professional.display_name} width={72} height={72} className="size-18 rounded-md object-cover" />
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-xl font-semibold">{professional.display_name}</h3>
                          <p className="text-sm capitalize text-muted-foreground">
                            {professional.profession_type} · {professional.city}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          <Star className="size-3 fill-current" />
                          {average ? average.toFixed(1) : "New"}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{professional.bio}</p>
                      <p className="mt-2 text-sm font-medium">{professional.specialty}</p>
                      <div className="mt-4 grid gap-2">
                        {(professional.professional_sessions ?? [])
                          .filter((session: any) => session.status === "available")
                          .map((session: any) => (
                            <div key={session.id} className="flex flex-col justify-between gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center">
                              <div>
                                <p className="font-medium">{session.focus}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sessionTime(session)} · {session.duration_minutes} min · {session.mode}
                                </p>
                              </div>
                              <Button className="rounded-md" onClick={() => bookSession(session)} disabled={busy}>
                                <CreditCard className="mr-2 size-4" />
                                {money(Number(session.price))}
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        <aside className="space-y-4">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-lg">My bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {bookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings yet.</p>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="rounded-md border border-border p-3">
                    <p className="font-medium">{booking.professional_profiles?.display_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.professional_sessions ? sessionTime(booking.professional_sessions) : "Session"} · {booking.payment_status}
                    </p>
                    <Button className="mt-3 w-full rounded-md" disabled={booking.status !== "confirmed"} onClick={() => joinSession(booking)}>
                      <Video className="mr-2 size-4" />
                      Join
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-lg">Leave a review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={reviewBookingId} onValueChange={setReviewBookingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select confirmed booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings
                    .filter((booking) => booking.status === "confirmed" && booking.payment_status === "paid")
                    .map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.professional_profiles?.display_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={rating} onValueChange={setRating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} stars
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="What helped?" />
              <Button className="w-full rounded-md" onClick={submitReview}>
                Submit review
              </Button>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  )
}
