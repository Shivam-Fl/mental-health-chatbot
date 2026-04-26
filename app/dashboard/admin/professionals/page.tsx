import { redirect } from "next/navigation"
import { CheckCircle2, Clock, Users, XCircle } from "lucide-react"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"
import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
}

export default async function AdminAllProfessionalsPage() {
  const user = await getDashboardUser()
  if (user.role !== "admin") redirect("/dashboard")

  const supabase = await createClient()
  const { data: professionals } = await supabase
    .from("professional_profiles")
    .select("*, professional_sessions(status)")
    .order("created_at", { ascending: false })

  return (
    <DashboardShell
      role="admin"
      name={user.name}
      title="All Professionals"
      description="Every professional who has created a profile on Psyspace, regardless of verification status."
    >
      <div className="space-y-4">
        {(!professionals || professionals.length === 0) ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <Users className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No professionals have registered yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {(professionals as any[]).map((pro) => {
              const statusKey = pro.verification_status ?? "pending"
              const cfg = statusConfig[statusKey] ?? statusConfig.pending
              const sessions = pro.professional_sessions ?? []
              const availableCount = sessions.filter((s: any) => s.status === "available").length

              return (
                <Card key={pro.id} className="rounded-xl">
                  <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary text-sm font-bold">
                        {pro.display_name?.[0]?.toUpperCase() ?? "P"}
                      </div>
                      <div>
                        <p className="font-semibold">{pro.display_name}</p>
                        <p className="text-sm capitalize text-muted-foreground">
                          {pro.profession_type} · {pro.city || "Remote"} · {pro.specialty || "General"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Joined {new Date(pro.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={cfg.variant} className="capitalize flex items-center gap-1">
                        <cfg.icon className="size-3" />
                        {cfg.label}
                      </Badge>
                      <Badge variant="outline">{availableCount} open slots</Badge>
                      <Badge variant="outline">₹{pro.consultation_fee?.toLocaleString("en-IN")}</Badge>
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
