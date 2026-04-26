import { redirect } from "next/navigation"

import { PatientDashboard } from "@/components/marketplace/patient-dashboard"
import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { FloatingChatButton } from "@/components/marketplace/floating-chat-button"
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

  const name = String(profile?.full_name ?? user.user_metadata?.full_name ?? "Patient")

  return (
    <>
      <DashboardShell
        role="patient"
        name={name}
        title="Find Your Care"
        description="Browse verified psychiatrists and psychologists, book paid sessions, and manage your mental health journey."
      >
        <PatientDashboard user={{ id: user.id, email: user.email ?? "", name }} />
      </DashboardShell>
      <FloatingChatButton />
    </>
  )
}
