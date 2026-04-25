import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function getDashboardUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle()

  return {
    id: user.id,
    email: user.email ?? "",
    name: String(profile?.full_name ?? user.user_metadata?.full_name ?? "Member"),
    role: String(profile?.role ?? user.user_metadata?.role ?? "patient"),
  }
}
