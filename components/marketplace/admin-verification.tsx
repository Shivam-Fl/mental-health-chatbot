"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock, ExternalLink, RefreshCw, ShieldOff, X, XCircle } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type VerificationDocument = {
  id: string
  professional_id: string
  document_type: string
  document_url: string
  status: "pending" | "approved" | "rejected"
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
  professional_profiles: {
    id: string
    display_name: string
    profession_type: string
    city: string
    specialty: string
    qualifications: string | null
    license_number: string | null
    verification_status: string
  } | null
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-amber-500",
  },
  approved: {
    label: "Approved",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-500",
  },
}

function DocumentCard({
  document,
  notes,
  onNotesChange,
  onAction,
  busy,
  showActions,
}: {
  document: VerificationDocument
  notes: string
  onNotesChange: (value: string) => void
  onAction: (approved: boolean | "revoke" | "reopen") => void
  busy: boolean
  showActions: "pending" | "approved" | "rejected" | "none"
}) {
  const profile = document.professional_profiles
  const cfg = statusConfig[document.status]

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <CardTitle className="text-lg">{profile?.display_name ?? "Professional"}</CardTitle>
          <p className="mt-1 text-sm capitalize text-muted-foreground">
            {profile?.profession_type} · {profile?.city || "No city listed"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Submitted: {new Date(document.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </p>
        </div>
        <Badge variant={cfg.variant} className="w-fit capitalize flex items-center gap-1">
          <cfg.icon className="size-3" />
          {cfg.label}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Document Type</span>
              <p className="font-medium capitalize">{document.document_type}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Specialty</span>
              <p className="font-medium">{profile?.specialty || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Qualifications</span>
              <p className="font-medium">{profile?.qualifications || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs uppercase tracking-wide">License No.</span>
              <p className="font-medium">{profile?.license_number || "—"}</p>
            </div>
          </div>
          {document.admin_notes && (
            <div className="rounded-lg bg-muted/50 p-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Admin Notes</span>
              <p className="mt-1 text-sm">{document.admin_notes}</p>
            </div>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-lg">
            <a href={document.document_url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 size-3.5" />
              Open Document
            </a>
          </Button>
        </div>

        {showActions !== "none" && (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Admin notes (optional)"
              className="text-sm"
              rows={3}
            />
            <div className="flex flex-col gap-2">
              {showActions === "pending" && (
                <>
                  <Button
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => onAction(true)}
                    disabled={busy}
                  >
                    <CheckCircle2 className="mr-2 size-4" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full rounded-lg"
                    onClick={() => onAction(false)}
                    disabled={busy}
                  >
                    <X className="mr-2 size-4" />
                    Reject
                  </Button>
                </>
              )}
              {showActions === "approved" && (
                <Button
                  variant="destructive"
                  className="w-full rounded-lg"
                  onClick={() => onAction("revoke")}
                  disabled={busy}
                >
                  <ShieldOff className="mr-2 size-4" />
                  Revoke Approval
                </Button>
              )}
              {showActions === "rejected" && (
                <Button
                  variant="outline"
                  className="w-full rounded-lg"
                  onClick={() => onAction("reopen")}
                  disabled={busy}
                >
                  <RefreshCw className="mr-2 size-4" />
                  Re-open for Review
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
      <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{message}</p>
    </div>
  )
}

export function AdminVerification() {
  const supabase = useMemo(() => createClient(), [])
  const [documents, setDocuments] = useState<VerificationDocument[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = async () => {
    const { data, error } = await supabase
      .from("professional_verification_documents")
      .select(
        "*, professional_profiles(id, display_name, profession_type, city, specialty, qualifications, license_number, verification_status)",
      )
      .order("created_at", { ascending: false })
    if (error) setMessage(error.message)
    setDocuments((data ?? []) as VerificationDocument[])
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAction = async (document: VerificationDocument, action: boolean | "revoke" | "reopen") => {
    setBusy(true)
    setMessage(null)

    let newDocStatus: "approved" | "rejected" | "pending"
    let newVerified: boolean
    let newVerificationStatus: string

    if (action === true) {
      newDocStatus = "approved"
      newVerified = true
      newVerificationStatus = "approved"
    } else if (action === false) {
      newDocStatus = "rejected"
      newVerified = false
      newVerificationStatus = "rejected"
    } else if (action === "revoke") {
      newDocStatus = "rejected"
      newVerified = false
      newVerificationStatus = "rejected"
    } else {
      // reopen
      newDocStatus = "pending"
      newVerified = false
      newVerificationStatus = "pending"
    }

    const { error: docError } = await supabase
      .from("professional_verification_documents")
      .update({
        status: newDocStatus,
        admin_notes: notes[document.id] ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", document.id)

    if (docError) {
      setMessage(docError.message)
      setBusy(false)
      return
    }

    const { error: profileError } = await supabase
      .from("professional_profiles")
      .update({
        is_verified: newVerified,
        verification_status: newVerificationStatus,
      })
      .eq("id", document.professional_id)

    const actionLabel =
      action === true ? "approved" : action === false ? "rejected" : action === "revoke" ? "revoked" : "re-opened"
    setMessage(profileError ? profileError.message : `Professional ${actionLabel} successfully.`)
    setBusy(false)
    await refresh()
  }

  const pending = documents.filter((d) => d.status === "pending")
  const approved = documents.filter((d) => d.status === "approved")
  const rejected = documents.filter((d) => d.status === "rejected")

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm font-medium">{message}</div>
      )}

      <Tabs defaultValue="pending">
        <TabsList className="h-10 rounded-xl">
          <TabsTrigger value="pending" className="rounded-lg gap-1.5">
            <Clock className="size-3.5" />
            Pending
            {pending.length > 0 && (
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-lg gap-1.5">
            <CheckCircle2 className="size-3.5" />
            Approved ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-lg gap-1.5">
            <XCircle className="size-3.5" />
            Rejected ({rejected.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {pending.length === 0 ? (
            <EmptyState message="No pending verification requests. All caught up!" />
          ) : (
            pending.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                notes={notes[doc.id] ?? ""}
                onNotesChange={(val) => setNotes((n) => ({ ...n, [doc.id]: val }))}
                onAction={(action) => handleAction(doc, action)}
                busy={busy}
                showActions="pending"
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6 space-y-4">
          {approved.length === 0 ? (
            <EmptyState message="No approved professionals yet." />
          ) : (
            approved.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                notes={notes[doc.id] ?? ""}
                onNotesChange={(val) => setNotes((n) => ({ ...n, [doc.id]: val }))}
                onAction={(action) => handleAction(doc, action)}
                busy={busy}
                showActions="approved"
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6 space-y-4">
          {rejected.length === 0 ? (
            <EmptyState message="No rejected submissions." />
          ) : (
            rejected.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                notes={notes[doc.id] ?? ""}
                onNotesChange={(val) => setNotes((n) => ({ ...n, [doc.id]: val }))}
                onAction={(action) => handleAction(doc, action)}
                busy={busy}
                showActions="rejected"
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
