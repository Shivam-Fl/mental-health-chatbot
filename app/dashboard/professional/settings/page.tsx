import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { ProfessionalSettings } from "@/components/marketplace/professional-settings"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"

export default async function ProfessionalSettingsPage() {
  const user = await getDashboardUser()

  if (user.role !== "psychiatrist" && user.role !== "psychologist") redirect("/dashboard")

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      title="Practice Settings"
      description="Edit your public profile, specialty, pricing baseline, city, and payment details."
    >
      <ProfessionalSettings user={user} />
    </DashboardShell>
  )
}
