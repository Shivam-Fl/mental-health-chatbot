"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { CalendarClock, FileCheck2, MessageSquareText, Settings } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProfessionalOverview({ user }: { user: { id: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("professional_profiles").select("*, professional_sessions(*)").eq("user_id", user.id).maybeSingle()
      setProfile(data)
      if (data) {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("*, professional_sessions(*)")
          .eq("professional_id", data.id)
          .order("created_at", { ascending: false })
        setBookings(bookingData ?? [])
      }
    }
    void load()
  }, [supabase, user.id])

  const verified = profile?.is_verified && profile?.verification_status === "approved"

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Verification" value={profile?.verification_status ?? "not submitted"} />
        <Metric label="Published sessions" value={String(profile?.professional_sessions?.length ?? 0)} />
        <Metric label="Confirmed bookings" value={String(bookings.filter((item) => item.status === "confirmed").length)} />
        <Metric label="Pending payments" value={String(bookings.filter((item) => item.payment_status !== "paid").length)} />
      </div>

      {!verified && (
        <Card className="rounded-md border-destructive/30 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-lg">Verification required before accepting sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Upload your degree, license, and qualifications. Admin approval unlocks session publishing.
            </p>
            <Button asChild className="rounded-md">
              <Link href="/dashboard/professional/verification">Submit documents</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Action href="/dashboard/professional/settings" title="Complete profile" icon={Settings} />
        <Action href="/dashboard/professional/verification" title="Verification center" icon={FileCheck2} />
        <Action href="/dashboard/professional/sessions" title="Manage sessions" icon={CalendarClock} />
      </div>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Recent bookings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            bookings.slice(0, 6).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="font-medium">{booking.professional_sessions?.focus ?? "Session"}</p>
                  <p className="text-sm text-muted-foreground">{booking.payment_status}</p>
                </div>
                <Badge variant="outline">{booking.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold capitalize">{value}</CardContent>
    </Card>
  )
}

function Action({ href, title, icon: Icon }: { href: string; title: string; icon: typeof MessageSquareText }) {
  return (
    <Button asChild variant="outline" className="h-20 justify-start rounded-md px-5">
      <Link href={href}>
        <Icon className="mr-3 size-5" />
        {title}
      </Link>
    </Button>
  )
}
