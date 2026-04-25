import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { ProfessionalSessions } from "@/components/marketplace/professional-sessions"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"

export default async function ProfessionalSessionsPage() {
  const user = await getDashboardUser()

  if (user.role !== "psychiatrist" && user.role !== "psychologist") redirect("/dashboard")

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      title="Sessions and Availability"
      description="Create available session slots, manage prices and modes, and track bookings. Verification is required before publishing."
    >
      <ProfessionalSessions user={user} />
    </DashboardShell>
  )
}
