import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = String(profile?.role ?? user.user_metadata?.role ?? "patient")

  if (role === "admin") redirect("/dashboard/admin/verification")
  if (role === "psychiatrist" || role === "psychologist") redirect("/dashboard/professional")

  redirect("/dashboard/patient")
}
