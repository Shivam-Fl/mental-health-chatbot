import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const { bookingId, role } = await request.json()

  if (!bookingId || !["patient", "professional"].includes(role)) {
    return NextResponse.json({ error: "Booking id and attendance role are required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const field = role === "patient" ? "patient_attended_at" : "professional_attended_at"
  const { error } = await supabase
    .from("bookings")
    .update({ [field]: new Date().toISOString() })
    .eq("id", bookingId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
