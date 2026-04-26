"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Clock, Loader2, LockKeyhole, Plus, Trash2, Zap } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const DAY_OFFSETS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }

function formatSessionDate(dateStr: string, timeStr: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(`${dateStr}T${timeStr}`),
  )
}

function groupByDate(sessions: any[]) {
  const map: Record<string, any[]> = {}
  for (const s of sessions) {
    if (!map[s.session_date]) map[s.session_date] = []
    map[s.session_date].push(s)
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
}

export function ProfessionalSessions({ user }: { user: { id: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error">("success")
  const [mode, setMode] = useState<"bulk" | "single">("bulk")

  // Bulk form
  const [bulk, setBulk] = useState({
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    selectedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] as string[],
    startHour: "09:00",
    endHour: "17:00",
    slotDuration: "60",
    price: "1500",
    sessionMode: "online",
    focus: "Consultation",
    meetingUrl: "",
    location: "",
  })

  // Single form
  const [single, setSingle] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    start_time: "10:00",
    duration_minutes: "60",
    price: "1500",
    sessionMode: "online",
    focus: "Consultation",
    meetingUrl: "",
    location: "",
  })

  const refresh = async () => {
    const { data } = await supabase
      .from("professional_profiles")
      .select("*, professional_sessions(*)")
      .eq("user_id", user.id)
      .maybeSingle()
    setProfile(data)
    const allSessions = (data?.professional_sessions ?? []).sort((a: any, b: any) =>
      `${a.session_date} ${a.start_time}`.localeCompare(`${b.session_date} ${b.start_time}`),
    )
    setSessions(allSessions)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verified = profile?.is_verified && profile?.verification_status === "approved"

  const toggleDay = (day: string) => {
    setBulk((b) => ({
      ...b,
      selectedDays: b.selectedDays.includes(day)
        ? b.selectedDays.filter((d) => d !== day)
        : [...b.selectedDays, day],
    }))
  }

  // Generate time slots between startHour and endHour with slotDuration
  function generateTimeSlots(startHour: string, endHour: string, durationMin: number): string[] {
    const slots: string[] = []
    const [sh, sm] = startHour.split(":").map(Number)
    const [eh, em] = endHour.split(":").map(Number)
    let current = sh * 60 + sm
    const end = eh * 60 + em
    while (current + durationMin <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, "0")
      const m = (current % 60).toString().padStart(2, "0")
      slots.push(`${h}:${m}`)
      current += durationMin
    }
    return slots
  }

  // Generate all dates in range that match selected days
  function getDatesInRange(from: string, to: string, days: string[]): string[] {
    const dates: string[] = []
    const start = new Date(from)
    const end = new Date(to)
    const dayOffsets = new Set(days.map((d) => DAY_OFFSETS[d]))
    const cur = new Date(start)
    while (cur <= end) {
      if (dayOffsets.has(cur.getDay())) {
        dates.push(cur.toISOString().slice(0, 10))
      }
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  const createBulkSessions = async () => {
    if (!verified) { setMessage("Admin verification required."); setMessageType("error"); return }
    if (!profile) { setMessage("Complete your profile first."); setMessageType("error"); return }
    if (bulk.selectedDays.length === 0) { setMessage("Select at least one day."); setMessageType("error"); return }

    setBusy(true)
    setMessage(null)

    const duration = Number(bulk.slotDuration) || 60
    const dates = getDatesInRange(bulk.dateFrom, bulk.dateTo, bulk.selectedDays)
    const timeSlots = generateTimeSlots(bulk.startHour, bulk.endHour, duration)

    if (dates.length === 0) { setMessage("No dates found in that range for the selected days."); setMessageType("error"); setBusy(false); return }
    if (timeSlots.length === 0) { setMessage("No time slots fit in that range. Check hours and duration."); setMessageType("error"); setBusy(false); return }

    const rows = dates.flatMap((date) =>
      timeSlots.map((time) => ({
        professional_id: profile.id,
        session_date: date,
        start_time: time,
        duration_minutes: duration,
        price: Number(bulk.price) || 0,
        mode: bulk.sessionMode,
        focus: bulk.focus,
        meeting_url: bulk.meetingUrl || null,
        location: bulk.location || null,
        status: "available",
      })),
    )

    const { error } = await supabase.from("professional_sessions").insert(rows)
    if (error) {
      setMessage(error.message)
      setMessageType("error")
    } else {
      setMessage(`✓ ${rows.length} slots published across ${dates.length} day(s).`)
      setMessageType("success")
      await refresh()
    }
    setBusy(false)
  }

  const createSingleSession = async () => {
    if (!verified) { setMessage("Admin verification required."); setMessageType("error"); return }
    if (!profile) { setMessage("Complete your profile first."); setMessageType("error"); return }
    setBusy(true)
    setMessage(null)
    const { error } = await supabase.from("professional_sessions").insert({
      professional_id: profile.id,
      session_date: single.session_date,
      start_time: single.start_time,
      duration_minutes: Number(single.duration_minutes) || 60,
      price: Number(single.price) || 0,
      mode: single.sessionMode,
      focus: single.focus,
      meeting_url: single.meetingUrl || null,
      location: single.location || null,
      status: "available",
    })
    if (error) { setMessage(error.message); setMessageType("error") }
    else { setMessage("Session published."); setMessageType("success"); await refresh() }
    setBusy(false)
  }

  const removeSession = async (id: string) => {
    await supabase.from("professional_sessions").delete().eq("id", id)
    await refresh()
  }

  const grouped = groupByDate(sessions)
  const availableCount = sessions.filter((s) => s.status === "available").length

  return (
    <div className="grid gap-6 lg:grid-cols-[460px_1fr]">
      {/* Left: Scheduler */}
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === "bulk" ? "default" : "outline"}
            className="rounded-xl flex-1 gap-2"
            onClick={() => setMode("bulk")}
          >
            <Zap className="size-4" />
            Bulk Scheduler
          </Button>
          <Button
            size="sm"
            variant={mode === "single" ? "default" : "outline"}
            className="rounded-xl flex-1 gap-2"
            onClick={() => setMode("single")}
          >
            <Plus className="size-4" />
            Single Slot
          </Button>
        </div>

        {message && (
          <div
            className={`rounded-xl border p-3 text-sm font-medium ${
              messageType === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {message}
          </div>
        )}

        {!verified && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-400">
            <LockKeyhole className="mr-2 inline size-4" />
            Admin verification required before publishing sessions.
          </div>
        )}

        {mode === "bulk" ? (
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="size-5 text-primary" />
                Bulk Availability Scheduler
              </CardTitle>
              <CardDescription>
                Set your working hours and days — slots are auto-generated for the whole period.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Input
                    type="date"
                    value={bulk.dateFrom}
                    onChange={(e) => setBulk((b) => ({ ...b, dateFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Input
                    type="date"
                    value={bulk.dateTo}
                    onChange={(e) => setBulk((b) => ({ ...b, dateTo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div className="space-y-1.5">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`h-9 w-12 rounded-lg text-sm font-medium border transition-all ${
                        bulk.selectedDays.includes(day)
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={bulk.startHour}
                    onChange={(e) => setBulk((b) => ({ ...b, startHour: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={bulk.endHour}
                    onChange={(e) => setBulk((b) => ({ ...b, endHour: e.target.value }))}
                  />
                </div>
              </div>

              {/* Slot Duration */}
              <div className="space-y-1.5">
                <Label>Slot Duration</Label>
                <Select
                  value={bulk.slotDuration}
                  onValueChange={(v) => setBulk((b) => ({ ...b, slotDuration: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes (1 hour)</SelectItem>
                    <SelectItem value="90">90 minutes (1.5 hours)</SelectItem>
                    <SelectItem value="120">120 minutes (2 hours)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Price (₹)</Label>
                  <Input
                    value={bulk.price}
                    onChange={(e) => setBulk((b) => ({ ...b, price: e.target.value }))}
                    placeholder="1500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select
                    value={bulk.sessionMode}
                    onValueChange={(v) => setBulk((b) => ({ ...b, sessionMode: v }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">In-person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Session Focus</Label>
                <Input
                  value={bulk.focus}
                  onChange={(e) => setBulk((b) => ({ ...b, focus: e.target.value }))}
                  placeholder="Consultation, Therapy, Follow-up…"
                />
              </div>

              {bulk.sessionMode === "online" && (
                <div className="space-y-1.5">
                  <Label>Meeting URL (optional)</Label>
                  <Input
                    value={bulk.meetingUrl}
                    onChange={(e) => setBulk((b) => ({ ...b, meetingUrl: e.target.value }))}
                    placeholder="Zoom / Google Meet link"
                  />
                </div>
              )}
              {bulk.sessionMode === "offline" && (
                <div className="space-y-1.5">
                  <Label>Clinic / Location</Label>
                  <Input
                    value={bulk.location}
                    onChange={(e) => setBulk((b) => ({ ...b, location: e.target.value }))}
                    placeholder="Full clinic address"
                  />
                </div>
              )}

              {/* Preview */}
              {bulk.dateFrom && bulk.dateTo && bulk.selectedDays.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <CalendarDays className="inline mr-1 size-3.5" />
                  Preview: {getDatesInRange(bulk.dateFrom, bulk.dateTo, bulk.selectedDays).length} day(s) ×{" "}
                  {generateTimeSlots(bulk.startHour, bulk.endHour, Number(bulk.slotDuration) || 60).length} slot(s) ={" "}
                  <strong className="text-foreground">
                    {getDatesInRange(bulk.dateFrom, bulk.dateTo, bulk.selectedDays).length *
                      generateTimeSlots(bulk.startHour, bulk.endHour, Number(bulk.slotDuration) || 60).length}{" "}
                    total slots
                  </strong>
                </div>
              )}

              <Button className="w-full rounded-xl gap-2" onClick={createBulkSessions} disabled={busy || !profile}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                Generate & Publish All Slots
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-5 text-primary" />
                Add Single Slot
              </CardTitle>
              <CardDescription>Manually add one specific session slot.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={single.session_date}
                    onChange={(e) => setSingle((s) => ({ ...s, session_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={single.start_time}
                    onChange={(e) => setSingle((s) => ({ ...s, start_time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Duration (min)</Label>
                  <Select
                    value={single.duration_minutes}
                    onValueChange={(v) => setSingle((s) => ({ ...s, duration_minutes: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Price (₹)</Label>
                  <Input
                    value={single.price}
                    onChange={(e) => setSingle((s) => ({ ...s, price: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Focus</Label>
                  <Input
                    value={single.focus}
                    onChange={(e) => setSingle((s) => ({ ...s, focus: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select
                    value={single.sessionMode}
                    onValueChange={(v) => setSingle((s) => ({ ...s, sessionMode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">In-person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {single.sessionMode === "online" && (
                <Input
                  value={single.meetingUrl}
                  onChange={(e) => setSingle((s) => ({ ...s, meetingUrl: e.target.value }))}
                  placeholder="Meeting URL (optional)"
                />
              )}
              {single.sessionMode === "offline" && (
                <Input
                  value={single.location}
                  onChange={(e) => setSingle((s) => ({ ...s, location: e.target.value }))}
                  placeholder="Clinic location"
                />
              )}
              <Button className="w-full rounded-xl gap-2" onClick={createSingleSession} disabled={busy || !profile}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                Publish Slot
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right: Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Your Sessions</h3>
          <div className="flex gap-2">
            <Badge variant="secondary">{availableCount} available</Badge>
            <Badge variant="outline">{sessions.length} total</Badge>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Clock className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sessions yet.</p>
            <p className="text-sm mt-1">Use the bulk scheduler to publish your availability.</p>
          </div>
        ) : (
          grouped.map(([date, dateSessions]) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(new Date(`${date}T00:00:00`))}
              </p>
              <div className="space-y-2">
                {dateSessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Clock className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {session.start_time.slice(0, 5)} · {session.focus}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.duration_minutes} min · {session.mode} · ₹
                          {Number(session.price).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          session.status === "available"
                            ? "secondary"
                            : session.status === "booked"
                            ? "default"
                            : "outline"
                        }
                        className="capitalize"
                      >
                        {session.status}
                      </Badge>
                      {session.status === "available" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeSession(session.id)}
                          aria-label="Delete session"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
