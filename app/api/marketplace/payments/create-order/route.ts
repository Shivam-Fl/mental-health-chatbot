import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type RazorpayOrderResponse = {
  id: string
  amount: number
  currency: string
  status: string
}

export async function POST(request: Request) {
  const { sessionId } = await request.json()

  if (!sessionId) {
    return NextResponse.json({ error: "Session id is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Login required before booking" }, { status: 401 })
  }

  const { data: session, error: sessionError } = await supabase
    .from("professional_sessions")
    .select(
      "id, professional_id, price, status, focus, professional_profiles(id, display_name, payment_link)",
    )
    .eq("id", sessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 })
  }

  if (session.status !== "available") {
    return NextResponse.json({ error: "This session is no longer available" }, { status: 409 })
  }

  const pricePaid = Number(session.price)
  const professionalProfile = Array.isArray(session.professional_profiles)
    ? session.professional_profiles[0]
    : session.professional_profiles

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      patient_id: user.id,
      professional_id: session.professional_id,
      session_id: session.id,
      price_paid: pricePaid,
      payment_status: "pending",
      status: "pending_payment",
    })
    .select("id")
    .single()

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message ?? "Unable to create booking" },
      { status: bookingError?.code === "23505" ? 409 : 400 },
    )
  }

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    await supabase
      .from("bookings")
      .update({ payment_status: "manual_pending", payment_provider: "manual" })
      .eq("id", booking.id)

    return NextResponse.json({
      bookingId: booking.id,
      manualPayment: true,
      paymentLink: professionalProfile?.payment_link ?? null,
      message: "Razorpay is not configured. Booking was saved as pending manual payment.",
    })
  }

  const credentials = Buffer.from(`${keyId}:${keySecret}`).toString("base64")
  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(pricePaid * 100),
      currency: "INR",
      receipt: booking.id,
      notes: {
        booking_id: booking.id,
        session_id: session.id,
        patient_id: user.id,
      },
    }),
  })

  if (!razorpayResponse.ok) {
    await supabase.from("bookings").update({ payment_status: "failed" }).eq("id", booking.id)
    return NextResponse.json({ error: "Unable to create Razorpay order" }, { status: 502 })
  }

  const order = (await razorpayResponse.json()) as RazorpayOrderResponse

  await supabase
    .from("bookings")
    .update({
      payment_provider: "razorpay",
      payment_order_id: order.id,
    })
    .eq("id", booking.id)

  return NextResponse.json({
    bookingId: booking.id,
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    name: "Aura Care",
    description: session.focus,
  })
}
