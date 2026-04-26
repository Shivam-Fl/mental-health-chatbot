import { redirect } from "next/navigation"
import { CheckCircle2, Star } from "lucide-react"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminApprovedPage() {
  const user = await getDashboardUser()
  if (user.role !== "admin") redirect("/dashboard")

  const supabase = await createClient()
  const { data: professionals } = await supabase
    .from("professional_profiles")
    .select("*, professional_reviews(rating), professional_sessions(status)")
    .eq("verification_status", "approved")
    .order("created_at", { ascending: false })

  return (
    <DashboardShell
      role="admin"
      name={user.name}
      title="Approved Professionals"
      description="All verified and approved professionals currently active on Psyspace."
    >
      <div className="space-y-4">
        {(!professionals || professionals.length === 0) ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <CheckCircle2 className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No approved professionals yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(professionals as any[]).map((pro) => {
              const reviews = pro.professional_reviews ?? []
              const avgRating =
                reviews.length > 0
                  ? (reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
                  : null
              const sessions = pro.professional_sessions ?? []
              const availableCount = sessions.filter((s: any) => s.status === "available").length

              return (
                <Card key={pro.id} className="rounded-xl">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{pro.display_name}</CardTitle>
                        <p className="text-sm capitalize text-muted-foreground mt-0.5">
                          {pro.profession_type} · {pro.city || "Remote"}
                        </p>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="size-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p className="text-muted-foreground line-clamp-2">{pro.specialty || "General mental health"}</p>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      {avgRating && (
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {avgRating} ({reviews.length})
                        </span>
                      )}
                      <span>{availableCount} open slots</span>
                      <span>₹{pro.consultation_fee?.toLocaleString("en-IN")}/session</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
