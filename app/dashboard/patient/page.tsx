import { redirect } from "next/navigation"

import { PatientDashboard } from "@/components/marketplace/patient-dashboard"
import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { createClient } from "@/lib/supabase/server"

export default async function PatientDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()
  const role = String(profile?.role ?? user.user_metadata?.role ?? "patient")

  if (role !== "patient") redirect("/dashboard")

  return (
    <DashboardShell
      role="patient"
      name={String(profile?.full_name ?? user.user_metadata?.full_name ?? "Patient")}
      title="Patient Dashboard"
      description="Browse verified professionals, book paid sessions, join appointments, and leave feedback after care."
    >
      <PatientDashboard user={{ id: user.id, email: user.email ?? "", name: String(profile?.full_name ?? user.user_metadata?.full_name ?? "Patient") }} />
    </DashboardShell>
  )
}
