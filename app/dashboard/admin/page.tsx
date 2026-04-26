import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, ClipboardList, Clock, Users } from "lucide-react"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function AdminOverviewPage() {
  const user = await getDashboardUser()
  if (user.role !== "admin") redirect("/dashboard")

  const supabase = await createClient()

  const [
    { count: pendingCount },
    { count: approvedCount },
    { count: rejectedCount },
    { count: totalProfessionals },
  ] = await Promise.all([
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "pending"),
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "approved"),
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "rejected"),
    supabase
      .from("professional_profiles")
      .select("id", { count: "exact", head: true }),
  ])

  const stats = [
    {
      label: "Pending Review",
      value: pendingCount ?? 0,
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      href: "/dashboard/admin/verification",
    },
    {
      label: "Approved Professionals",
      value: approvedCount ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      href: "/dashboard/admin/approved",
    },
    {
      label: "Rejected",
      value: rejectedCount ?? 0,
      icon: ClipboardList,
      color: "text-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      href: "/dashboard/admin/verification",
    },
    {
      label: "Total Professionals",
      value: totalProfessionals ?? 0,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/dashboard/admin/professionals",
    },
  ]

  return (
    <DashboardShell
      role="admin"
      name={user.name}
      title="Admin Overview"
      description="Platform health, verification queue, and professional management."
    >
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className={`${stat.bg} p-2 rounded-lg`}>
                    <stat.icon className={`size-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/admin/verification">
                <ClipboardList className="mr-2 size-4" />
                Review Pending ({pendingCount ?? 0})
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/approved">
                <CheckCircle2 className="mr-2 size-4" />
                View Approved
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/professionals">
                <Users className="mr-2 size-4" />
                All Professionals
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
