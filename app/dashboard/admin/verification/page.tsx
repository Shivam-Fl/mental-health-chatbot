import { redirect } from "next/navigation"

import { AdminVerification } from "@/components/marketplace/admin-verification"
import { DashboardShell } from "@/components/marketplace/dashboard-shell"
import { getDashboardUser } from "@/lib/marketplace/dashboard-user"

export default async function AdminVerificationPage() {
  const user = await getDashboardUser()

  if (user.role !== "admin") redirect("/dashboard")

  return (
    <DashboardShell
      role="admin"
      name={user.name}
      title="Verification Queue"
      description="Review professional documents and approve or reject psychiatrists and psychologists before they accept sessions."
    >
      <AdminVerification />
    </DashboardShell>
  )
}
