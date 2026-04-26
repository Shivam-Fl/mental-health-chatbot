import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

// Patient-side: confirm they've paid manually (no Razorpay configured)
export async function POST(request: Request) {
  const { bookingId } = await request.json()

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  // Verify the booking belongs to this patient and is in manual_pending state
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, session_id, payment_status, patient_id")
    .eq("id", bookingId)
    .eq("patient_id", user.id)
    .single()

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  if (booking.payment_status !== "manual_pending") {
    return NextResponse.json({ error: "This booking is not awaiting manual payment" }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payment_status: "paid",
      status: "confirmed",
    })
    .eq("id", bookingId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  // Mark session as booked
  await supabase.from("professional_sessions").update({ status: "booked" }).eq("id", booking.session_id)

  return NextResponse.json({ ok: true, message: "Payment confirmed. Session is now booked!" })
}
