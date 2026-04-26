"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Camera, Loader2, Save } from "lucide-react"
import Image from "next/image"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ProfessionalSettings({ user }: { user: { id: string; name: string; role: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
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

  const handlePhotoUpload = async (file: File) => {
    setUploading(true)
    const ext = file.name.split(".").pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from("professional-documents")
      .upload(path, file, { upsert: true })
    if (uploadError) {
      setMessage({ text: uploadError.message, type: "error" })
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from("professional-documents").getPublicUrl(path)
    setForm((f) => ({ ...f, avatar_url: data.publicUrl }))
    setUploading(false)
    setMessage({ text: "Photo uploaded.", type: "success" })
  }

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
    setMessage(error ? { text: error.message, type: "error" } : { text: "Profile saved successfully.", type: "success" })
    setBusy(false)
  }

  return (
    <div className="max-w-3xl space-y-6">
      {message && (
        <div
          className={`rounded-xl border p-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Photo */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Upload a professional photo visible to patients.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-5">
          <div className="relative size-20 shrink-0">
            <Image
              src={form.avatar_url || "/placeholder-user.jpg"}
              alt="Avatar"
              fill
              className="rounded-2xl object-cover border border-border"
            />
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handlePhotoUpload(file)
              }}
            />
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
              {uploading ? "Uploading…" : "Upload Photo"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">JPG, PNG, or WebP. Max 5 MB.</p>
          </div>
        </CardContent>
      </Card>

      {/* Practice Info */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Practice Profile</CardTitle>
          <CardDescription>This information is shown to patients browsing professionals.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input {...field("display_name")} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input {...field("city")} placeholder="Mumbai, Delhi, Remote…" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Years of Experience</Label>
              <Input {...field("years_experience")} type="number" min="0" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label>Base Consultation Fee (₹)</Label>
              <Input {...field("consultation_fee")} type="number" min="0" className="rounded-xl" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Specialty</Label>
              <Input
                {...field("specialty")}
                placeholder="Anxiety, Depression, OCD, Trauma, Couples therapy…"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Manual Payment Link</Label>
              <Input
                {...field("payment_link")}
                placeholder="Razorpay / UPI / Stripe link"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea
              {...field("bio")}
              placeholder="Tell patients about your approach, training, and what they can expect…"
              rows={5}
              className="rounded-xl"
            />
          </div>
          <Button className="w-fit rounded-xl gap-2" onClick={save} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
