"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, ExternalLink, Loader2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function AdminVerification() {
  const supabase = useMemo(() => createClient(), [])
  const [documents, setDocuments] = useState<any[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = async () => {
    const { data, error } = await supabase
      .from("professional_verification_documents")
      .select("*, professional_profiles(id, display_name, profession_type, city, specialty, qualifications, license_number)")
      .order("created_at", { ascending: false })
    setMessage(error?.message ?? null)
    setDocuments(data ?? [])
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const review = async (document: any, approved: boolean) => {
    setBusy(true)
    const status = approved ? "approved" : "rejected"
    const { error: documentError } = await supabase
      .from("professional_verification_documents")
      .update({
        status,
        admin_notes: notes[document.id] ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", document.id)

    if (documentError) {
      setMessage(documentError.message)
      setBusy(false)
      return
    }

    const { error: profileError } = await supabase
      .from("professional_profiles")
      .update({
        is_verified: approved,
        verification_status: status,
      })
      .eq("id", document.professional_id)

    setMessage(profileError ? profileError.message : `Professional ${status}.`)
    setBusy(false)
    await refresh()
  }

  return (
    <div className="space-y-4">
      {message && <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">{message}</div>}
      {documents.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
          No verification documents are waiting for review.
        </div>
      ) : (
        documents.map((document) => (
          <Card key={document.id} className="rounded-md">
            <CardHeader className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <CardTitle>{document.professional_profiles?.display_name ?? "Professional"}</CardTitle>
                <p className="mt-1 text-sm capitalize text-muted-foreground">
                  {document.professional_profiles?.profession_type} · {document.professional_profiles?.city || "No city"}
                </p>
              </div>
              <Badge variant={document.status === "approved" ? "default" : "outline"}>{document.status}</Badge>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3 text-sm">
                <p>
                  <strong>Document:</strong> {document.document_type}
                </p>
                <p>
                  <strong>Specialty:</strong> {document.professional_profiles?.specialty || "Not provided"}
                </p>
                <p>
                  <strong>Qualifications:</strong> {document.professional_profiles?.qualifications || "Not provided"}
                </p>
                <p>
                  <strong>License:</strong> {document.professional_profiles?.license_number || "Not provided"}
                </p>
                <Button asChild variant="outline" className="rounded-md">
                  <a href={document.document_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 size-4" />
                    Open document
                  </a>
                </Button>
              </div>
              <div className="space-y-3">
                <Textarea
                  value={notes[document.id] ?? ""}
                  onChange={(event) => setNotes((value) => ({ ...value, [document.id]: event.target.value }))}
                  placeholder="Admin notes"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button className="rounded-md" onClick={() => review(document, true)} disabled={busy}>
                    {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
                    Approve
                  </Button>
                  <Button variant="destructive" className="rounded-md" onClick={() => review(document, false)} disabled={busy}>
                    <X className="mr-2 size-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
