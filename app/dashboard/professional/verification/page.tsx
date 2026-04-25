import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { ProfessionalVerification } from "@/components/marketplace/professional-verification"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"

export default async function ProfessionalVerificationPage() {
  const user = await getDashboardUser()

  if (user.role !== "psychiatrist" && user.role !== "psychologist") redirect("/dashboard")

  return (
    <DashboardShell
      role={user.role}
      name={user.name}
      title="Professional Verification"
      description="Submit your degree, license, and qualification documents for admin review before accepting paid sessions."
    >
      <ProfessionalVerification user={user} />
    </DashboardShell>
  )
}
