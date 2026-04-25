"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, LockKeyhole, Plus, Trash2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function ProfessionalSessions({ user }: { user: { id: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    start_time: "17:00",
    duration_minutes: "45",
    price: "1500",
    mode: "online",
    focus: "Consultation",
    meeting_url: "",
    location: "",
  })

  const refresh = async () => {
    const { data } = await supabase.from("professional_profiles").select("*, professional_sessions(*)").eq("user_id", user.id).maybeSingle()
    setProfile(data)
    setSessions(data?.professional_sessions ?? [])
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verified = profile?.is_verified && profile?.verification_status === "approved"

  const createSession = async () => {
    if (!verified) {
      setMessage("Admin verification is required before publishing sessions.")
      return
    }
    setBusy(true)
    const { error } = await supabase.from("professional_sessions").insert({
      professional_id: profile.id,
      session_date: form.session_date,
      start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes) || 45,
      price: Number(form.price) || 0,
      mode: form.mode,
      focus: form.focus,
      meeting_url: form.meeting_url || null,
      location: form.location || null,
      status: "available",
    })
    setMessage(error ? error.message : "Session published.")
    setBusy(false)
    if (!error) await refresh()
  }

  const removeSession = async (id: string) => {
    await supabase.from("professional_sessions").delete().eq("id", id)
    await refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Create availability</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {message && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
          {!verified && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <LockKeyhole className="mr-2 inline size-4" />
              You must complete admin verification before accepting sessions.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input type="date" value={form.session_date} onChange={(event) => setForm((value) => ({ ...value, session_date: event.target.value }))} />
            <Input type="time" value={form.start_time} onChange={(event) => setForm((value) => ({ ...value, start_time: event.target.value }))} />
            <Input value={form.duration_minutes} onChange={(event) => setForm((value) => ({ ...value, duration_minutes: event.target.value }))} placeholder="Duration" />
            <Input value={form.price} onChange={(event) => setForm((value) => ({ ...value, price: event.target.value }))} placeholder="Price" />
          </div>
          <Input value={form.focus} onChange={(event) => setForm((value) => ({ ...value, focus: event.target.value }))} placeholder="Session focus" />
          <Select value={form.mode} onValueChange={(mode) => setForm((value) => ({ ...value, mode }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Input value={form.meeting_url} onChange={(event) => setForm((value) => ({ ...value, meeting_url: event.target.value }))} placeholder="Meeting URL" />
          <Input value={form.location} onChange={(event) => setForm((value) => ({ ...value, location: event.target.value }))} placeholder="Clinic location" />
          <Button className="rounded-md" onClick={createSession} disabled={busy || !profile}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
            Publish session
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">No sessions yet.</div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="flex flex-col justify-between gap-4 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-medium">{session.focus}</p>
                <p className="text-sm text-muted-foreground">
                  {session.session_date} {session.start_time} · INR {session.price} · {session.mode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{session.status}</Badge>
                <Button variant="outline" size="icon" className="rounded-md" onClick={() => removeSession(session.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
