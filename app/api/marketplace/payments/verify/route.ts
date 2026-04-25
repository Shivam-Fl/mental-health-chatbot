import crypto from "crypto"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()

  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Payment verification details are required" }, { status: 400 })
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keySecret) {
    return NextResponse.json({ error: "Razorpay secret is not configured" }, { status: 500 })
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex")

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment signature mismatch" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, session_id")
    .eq("id", bookingId)
    .eq("patient_id", user.id)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({
      payment_provider: "razorpay",
      payment_status: "paid",
      payment_id: razorpay_payment_id,
      payment_order_id: razorpay_order_id,
      status: "confirmed",
    })
    .eq("id", bookingId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  await supabase.from("professional_sessions").update({ status: "booked" }).eq("id", booking.session_id)

  return NextResponse.json({ ok: true })
}
