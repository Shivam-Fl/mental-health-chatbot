"use client"

import { useEffect, useMemo, useState } from "react"
import { FileUp, Loader2, Send } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function ProfessionalVerification({ user }: { user: { id: string; name: string; role: string } }) {
  const supabase = useMemo(() => createClient(), [])
  const [profile, setProfile] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [documentType, setDocumentType] = useState("degree")
  const [file, setFile] = useState<File | null>(null)
  const [qualifications, setQualifications] = useState("")
  const [licenseNumber, setLicenseNumber] = useState("")

  const refresh = async () => {
    const { data } = await supabase.from("professional_profiles").select("*").eq("user_id", user.id).maybeSingle()
    setProfile(data)
    setQualifications(data?.qualifications ?? "")
    setLicenseNumber(data?.license_number ?? "")
    if (data) {
      const { data: docs } = await supabase
        .from("professional_verification_documents")
        .select("*")
        .eq("professional_id", data.id)
        .order("created_at", { ascending: false })
      setDocuments(docs ?? [])
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ensureProfile = async () => {
    if (profile) return profile
    const { data, error } = await supabase
      .from("professional_profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: user.name,
          profession_type: user.role,
          city: "",
          specialty: "",
          bio: "",
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  const submit = async () => {
    if (!file) {
      setMessage("Choose a degree, license, or qualification document first.")
      return
    }
    setBusy(true)
    try {
      const currentProfile = await ensureProfile()
      const path = `${user.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from("professional-documents").upload(path, file)
      if (uploadError) throw uploadError
      const { data: signed } = await supabase.storage.from("professional-documents").createSignedUrl(path, 60 * 60 * 24 * 7)
      const documentUrl = signed?.signedUrl ?? path

      const { error: docError } = await supabase.from("professional_verification_documents").insert({
        professional_id: currentProfile.id,
        user_id: user.id,
        document_type: documentType,
        document_url: documentUrl,
      })
      if (docError) throw docError

      const { error: profileError } = await supabase
        .from("professional_profiles")
        .update({
          qualifications,
          license_number: licenseNumber,
          verification_status: "pending",
          is_verified: false,
        })
        .eq("id", currentProfile.id)
      if (profileError) throw profileError

      setMessage("Verification submitted for admin review.")
      setFile(null)
      await refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit verification.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Submit documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
          <Badge variant={profile?.verification_status === "approved" ? "default" : "outline"} className="capitalize">
            {profile?.verification_status ?? "not submitted"}
          </Badge>
          <div className="space-y-2">
            <Label>Qualifications</Label>
            <Textarea value={qualifications} onChange={(event) => setQualifications(event.target.value)} placeholder="MBBS, MD Psychiatry, M.Phil Clinical Psychology..." />
          </div>
          <div className="space-y-2">
            <Label>License / registration number</Label>
            <Input value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} />
          </div>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="degree">Degree certificate</SelectItem>
              <SelectItem value="license">License / registration</SelectItem>
              <SelectItem value="identity">Identity proof</SelectItem>
              <SelectItem value="other">Other qualification</SelectItem>
            </SelectContent>
          </Select>
          <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button className="w-full rounded-md" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}
            Upload and submit
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Submitted documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            documents.map((document) => (
              <div key={document.id} className="flex flex-col justify-between gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium capitalize">{document.document_type}</p>
                  <p className="text-sm text-muted-foreground">{document.status}</p>
                </div>
                <Button asChild variant="outline" className="rounded-md">
                  <a href={document.document_url} target="_blank" rel="noreferrer">
                    <Send className="mr-2 size-4" />
                    Open
                  </a>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
