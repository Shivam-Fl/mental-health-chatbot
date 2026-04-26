"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CalendarClock, FileCheck2, IndianRupee, Settings, Star, TrendingUp, Users } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)
}

function formatDateTime(dateStr: string, timeStr: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(`${dateStr}T${timeStr}`),
  )
}

export function ProfessionalOverview({ user }: { user: { id: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: profileData } = await supabase
        .from("professional_profiles")
        .select("*, professional_sessions(*)")
        .eq("user_id", user.id)
        .maybeSingle()
      setProfile(profileData)

      if (profileData) {
        const [{ data: bookingData }, { data: reviewData }] = await Promise.all([
          supabase
            .from("bookings")
            .select("*, professional_sessions(session_date, start_time, focus)")
            .eq("professional_id", profileData.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("professional_reviews")
            .select("rating, feedback, created_at")
            .eq("professional_id", profileData.id)
            .order("created_at", { ascending: false }),
        ])

        setBookings(bookingData ?? [])
        setReviews(reviewData ?? [])

        // Upcoming: booked sessions in the future
        const now = new Date()
        const upcoming = (profileData.professional_sessions ?? [])
          .filter((s: any) => {
            if (s.status !== "booked") return false
            const sessionDate = new Date(`${s.session_date}T${s.start_time}`)
            return sessionDate > now
          })
          .sort((a: any, b: any) =>
            `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`),
          )
          .slice(0, 5)
        setUpcomingSessions(upcoming)
      }
    }
    void load()
  }, [supabase, user.id])

  const verified = profile?.is_verified && profile?.verification_status === "approved"
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed")
  const paidBookings = bookings.filter((b) => b.payment_status === "paid")
  const totalEarnings = paidBookings.reduce((sum, b) => sum + Number(b.price_paid ?? 0), 0)
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
    : null

  const metrics = [
    {
      label: "Total Earnings",
      value: formatMoney(totalEarnings),
      icon: IndianRupee,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Confirmed Sessions",
      value: String(confirmedBookings.length),
      icon: CalendarClock,
      color: "text-blue-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Total Patients",
      value: String(new Set(bookings.map((b) => b.patient_id)).size),
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "Avg. Rating",
      value: avgRating ? `${avgRating.toFixed(1)} ★` : "No reviews",
      icon: Star,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Verification Alert */}
      {!verified && (
        <Card className="rounded-xl border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Verification required</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                {profile?.verification_status === "pending"
                  ? "Your documents are under review. You'll be notified once approved."
                  : "Upload your degree, license, and qualifications to start accepting sessions."}
              </p>
            </div>
            {profile?.verification_status !== "pending" && (
              <Button asChild className="rounded-xl shrink-0 bg-amber-600 hover:bg-amber-700">
                <Link href="/dashboard/professional/verification">Submit Documents</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{m.label}</CardTitle>
              <div className={`${m.bg} p-2 rounded-lg`}>
                <m.icon className={`size-4 ${m.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 md:grid-cols-3">
        {[
          { href: "/dashboard/professional/settings", title: "Complete Profile", icon: Settings, desc: "Update bio, fee, photo" },
          { href: "/dashboard/professional/verification", title: "Verification Center", icon: FileCheck2, desc: verified ? "Verified ✓" : "Submit documents" },
          { href: "/dashboard/professional/sessions", title: "Manage Availability", icon: CalendarClock, desc: "Bulk schedule slots" },
        ].map((action) => (
          <Button
            key={action.href}
            asChild
            variant="outline"
            className="h-auto flex-col items-start gap-1 rounded-xl p-4 text-left"
          >
            <Link href={action.href}>
              <action.icon className="size-5 mb-1 text-primary" />
              <span className="font-semibold">{action.title}</span>
              <span className="text-xs text-muted-foreground font-normal">{action.desc}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Sessions */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Sessions</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming booked sessions.</p>
            ) : (
              upcomingSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{session.focus}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(session.session_date, session.start_time)}
                    </p>
                  </div>
                  <Badge variant="default">Booked</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Reviews</CardTitle>
            <Star className="size-4 text-amber-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet. Reviews appear after completed sessions.</p>
            ) : (
              reviews.slice(0, 4).map((review: any, i: number) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-1">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`size-3 ${idx < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`}
                      />
                    ))}
                  </div>
                  {review.feedback && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{review.feedback}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            bookings.slice(0, 8).map((booking: any) => (
              <div
                key={booking.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-medium text-sm">
                    {booking.professional_sessions?.focus ?? "Session"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {booking.professional_sessions
                      ? formatDateTime(
                          booking.professional_sessions.session_date,
                          booking.professional_sessions.start_time,
                        )
                      : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="capitalize">
                    {booking.status.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant={booking.payment_status === "paid" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {booking.payment_status.replace("_", " ")}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
