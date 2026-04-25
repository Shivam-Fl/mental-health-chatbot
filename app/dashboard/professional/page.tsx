import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { ProfessionalOverview } from "@/components/marketplace/professional-overview"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"

export default async function ProfessionalDashboardPage() {
  const user = await getDashboardUser()

  if (user.role !== "psychiatrist" && user.role !== "psychologist") redirect("/dashboard")

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      title="Professional Dashboard"
      description="Manage verification, availability, bookings, content, and settings for your practice."
    >
      <ProfessionalOverview user={user} />
    </DashboardShell>
  )
}
