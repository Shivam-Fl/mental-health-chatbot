"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ProfessionalSettings({ user }: { user: { id: string; name: string; role: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    display_name: user.name,
    city: "",
    specialty: "",
    bio: "",
    years_experience: "0",
    consultation_fee: "1500",
    payment_link: "",
    avatar_url: "",
  })

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).maybeSingle()
      if (data) {
        setForm({
          display_name: data.display_name ?? user.name,
          city: data.city ?? "",
          specialty: data.specialty ?? "",
          bio: data.bio ?? "",
          years_experience: String(data.years_experience ?? 0),
          consultation_fee: String(data.consultation_fee ?? 1500),
          payment_link: data.payment_link ?? "",
          avatar_url: data.avatar_url ?? "",
        })
      }
    }
    void load()
  }, [supabase, user.id, user.name])

  const save = async () => {
    setBusy(true)
    const { error } = await supabase.from("professional_profiles").upsert(
      {
        user_id: user.id,
        display_name: form.display_name,
        profession_type: user.role,
        city: form.city,
        specialty: form.specialty,
        bio: form.bio,
        years_experience: Number(form.years_experience) || 0,
        consultation_fee: Number(form.consultation_fee) || 0,
        payment_link: form.payment_link || null,
        avatar_url: form.avatar_url || null,
      },
      { onConflict: "user_id" },
    )
    setMessage(error ? error.message : "Practice profile saved.")
    setBusy(false)
  }

  return (
    <Card className="max-w-3xl rounded-md">
      <CardHeader>
        <CardTitle>Public practice profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {message && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Display name" value={form.display_name} onChange={(display_name) => setForm((value) => ({ ...value, display_name }))} />
          <Field label="City" value={form.city} onChange={(city) => setForm((value) => ({ ...value, city }))} />
          <Field label="Years of experience" value={form.years_experience} onChange={(years_experience) => setForm((value) => ({ ...value, years_experience }))} />
          <Field label="Base consultation fee" value={form.consultation_fee} onChange={(consultation_fee) => setForm((value) => ({ ...value, consultation_fee }))} />
          <Field label="Specialty" value={form.specialty} onChange={(specialty) => setForm((value) => ({ ...value, specialty }))} />
          <Field label="Manual payment link" value={form.payment_link} onChange={(payment_link) => setForm((value) => ({ ...value, payment_link }))} />
        </div>
        <div className="space-y-2">
          <Label>Avatar URL</Label>
          <Input value={form.avatar_url} onChange={(event) => setForm((value) => ({ ...value, avatar_url: event.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea value={form.bio} onChange={(event) => setForm((value) => ({ ...value, bio: event.target.value }))} className="min-h-28" />
        </div>
        <Button className="w-fit rounded-md" onClick={save} disabled={busy}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
          Save settings
        </Button>
      </CardContent>
    </Card>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
