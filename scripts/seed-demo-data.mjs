#!/usr/bin/env node
/**
 * Psyspace Demo Data Seed Script
 * 
 * Usage:
 *   1. Copy your Supabase credentials into .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 *   2. Run: node scripts/seed-demo-data.mjs
 * 
 * This creates:
 *   - 10 professional profiles (psychiatrists & psychologists)
 *   - 5 patient profiles
 *   - 60+ session slots spread over the next 30 days
 *   - 30+ bookings
 *   - 50+ reviews with realistic text
 */

import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
// Load .env then .env.local (whichever has the keys)
config({ path: join(__dirname, "../.env") })
config({ path: join(__dirname, "../.env.local"), override: false })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = "Psyspace@123"

// ── Helpers ────────────────────────────────────────────────────────────────

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomRating() {
  // Skew toward 4-5 for demo
  return randomFrom([3, 4, 4, 4, 5, 5, 5, 5])
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── Demo Data ─────────────────────────────────────────────────────────────

const PROFESSIONALS = [
  {
    email: "dr.priya.sharma@psyspace.in",
    full_name: "Dr. Priya Sharma",
    role: "psychologist",
    profile: {
      display_name: "Dr. Priya Sharma",
      profession_type: "psychologist",
      city: "Mumbai",
      specialty: "Anxiety, Depression, Cognitive Behavioural Therapy (CBT)",
      bio: "I'm a clinical psychologist with 12 years of experience helping individuals navigate anxiety, depression, and life transitions. My approach is warm, evidence-based, and deeply person-centred. I believe everyone has the capacity to heal — sometimes we just need the right support.",
      years_experience: 12,
      consultation_fee: 1800,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
    },
  },
  {
    email: "dr.arjun.mehta@psyspace.in",
    full_name: "Dr. Arjun Mehta",
    role: "psychiatrist",
    profile: {
      display_name: "Dr. Arjun Mehta",
      profession_type: "psychiatrist",
      city: "Delhi",
      specialty: "Bipolar Disorder, Schizophrenia, Medication Management, OCD",
      bio: "Consultant psychiatrist with 15+ years of experience across both private practice and hospital settings. I specialise in complex psychiatric conditions including bipolar disorder and treatment-resistant depression. I take a holistic approach combining medication and psychotherapy.",
      years_experience: 15,
      consultation_fee: 2500,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
    },
  },
  {
    email: "dr.neha.kapoor@psyspace.in",
    full_name: "Dr. Neha Kapoor",
    role: "psychologist",
    profile: {
      display_name: "Dr. Neha Kapoor",
      profession_type: "psychologist",
      city: "Bangalore",
      specialty: "Trauma, PTSD, Mindfulness-Based Therapy, Stress Management",
      bio: "Trauma-informed psychologist trained in EMDR and mindfulness-based cognitive therapy. I work with individuals who have experienced trauma, burnout, or chronic stress. My sessions are a safe, non-judgmental space to process and heal.",
      years_experience: 9,
      consultation_fee: 1600,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/women/68.jpg",
    },
  },
  {
    email: "dr.rahul.gupta@psyspace.in",
    full_name: "Dr. Rahul Gupta",
    role: "psychiatrist",
    profile: {
      display_name: "Dr. Rahul Gupta",
      profession_type: "psychiatrist",
      city: "Pune",
      specialty: "ADHD, Child & Adolescent Psychiatry, Autism Spectrum Disorders",
      bio: "Child and adolescent psychiatrist with a special interest in ADHD, learning disabilities, and autism spectrum conditions. I work collaboratively with families and schools to create holistic support plans.",
      years_experience: 11,
      consultation_fee: 2000,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/men/58.jpg",
    },
  },
  {
    email: "dr.sunita.patel@psyspace.in",
    full_name: "Dr. Sunita Patel",
    role: "psychologist",
    profile: {
      display_name: "Dr. Sunita Patel",
      profession_type: "psychologist",
      city: "Ahmedabad",
      specialty: "Couples Therapy, Relationship Issues, Family Counselling",
      bio: "Specialist in relationships and family dynamics with 8 years of experience. Whether you're working through conflict, communication breakdowns, or separation, I provide a structured, compassionate space for couples and families to reconnect.",
      years_experience: 8,
      consultation_fee: 2200,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/women/21.jpg",
    },
  },
  {
    email: "dr.anjali.singh@psyspace.in",
    full_name: "Dr. Anjali Singh",
    role: "psychiatrist",
    profile: {
      display_name: "Dr. Anjali Singh",
      profession_type: "psychiatrist",
      city: "Hyderabad",
      specialty: "Women's Mental Health, Postpartum Depression, Hormonal Mood Disorders",
      bio: "Psychiatrist specialising in women's mental health across the lifespan — from adolescence through menopause. I am particularly experienced in postpartum mental health, premenstrual mood disorders, and anxiety in women.",
      years_experience: 10,
      consultation_fee: 1900,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/women/55.jpg",
    },
  },
  {
    email: "dr.vikram.nair@psyspace.in",
    full_name: "Dr. Vikram Nair",
    role: "psychologist",
    profile: {
      display_name: "Dr. Vikram Nair",
      profession_type: "psychologist",
      city: "Chennai",
      specialty: "Career Burnout, Work Stress, Executive Coaching, Performance Anxiety",
      bio: "Organisational psychologist turned therapist, I work primarily with professionals experiencing burnout, career anxiety, and high-performance pressure. My background in corporate psychology gives me a unique understanding of workplace stress.",
      years_experience: 7,
      consultation_fee: 2000,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/men/75.jpg",
    },
  },
  {
    email: "dr.meera.krishnan@psyspace.in",
    full_name: "Dr. Meera Krishnan",
    role: "psychologist",
    profile: {
      display_name: "Dr. Meera Krishnan",
      profession_type: "psychologist",
      city: "Kochi",
      specialty: "Grief, Loss, Existential Therapy, Spiritual Psychology",
      bio: "I accompany people through grief, loss, and existential questioning. Drawing from both Western psychology and Eastern philosophy, I offer a unique perspective on suffering and meaning-making. Available online for clients across India.",
      years_experience: 14,
      consultation_fee: 1500,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/women/33.jpg",
    },
  },
  {
    email: "dr.rohan.desai@psyspace.in",
    full_name: "Dr. Rohan Desai",
    role: "psychiatrist",
    profile: {
      display_name: "Dr. Rohan Desai",
      profession_type: "psychiatrist",
      city: "Mumbai",
      specialty: "Addiction Psychiatry, Substance Use Disorders, Dual Diagnosis",
      bio: "Addiction psychiatrist with experience in both inpatient and outpatient settings. I provide non-judgmental, evidence-based care for substance use disorders and co-occurring conditions like depression and anxiety.",
      years_experience: 13,
      consultation_fee: 2800,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/men/48.jpg",
    },
  },
  {
    email: "dr.kavitha.rajan@psyspace.in",
    full_name: "Dr. Kavitha Rajan",
    role: "psychologist",
    profile: {
      display_name: "Dr. Kavitha Rajan",
      profession_type: "psychologist",
      city: "Coimbatore",
      specialty: "Child Psychology, Learning Difficulties, Parenting Support",
      bio: "Child psychologist with extensive experience supporting children aged 4–18 with emotional, behavioural, and learning difficulties. I work closely with parents to create strategies that support the whole family.",
      years_experience: 6,
      consultation_fee: 1400,
      is_verified: true,
      verification_status: "approved",
      avatar_url: "https://randomuser.me/api/portraits/women/12.jpg",
    },
  },
]

const PATIENTS = [
  { email: "aisha.sharma@demo.in", full_name: "Aisha Sharma" },
  { email: "rahul.verma@demo.in", full_name: "Rahul Verma" },
  { email: "priya.nair@demo.in", full_name: "Priya Nair" },
  { email: "arjun.patel@demo.in", full_name: "Arjun Patel" },
  { email: "neha.gupta@demo.in", full_name: "Neha Gupta" },
]

const REVIEW_TEXTS = [
  "Incredibly warm and professional. I felt heard from the very first session. Already seeing significant improvement in my anxiety.",
  "Dr. was thorough, empathetic, and gave me practical tools I could use immediately. The session was worth every rupee.",
  "I was nervous about therapy but the doctor made me feel completely safe. Highly recommend to anyone struggling.",
  "Outstanding. My depression has improved dramatically after just 3 sessions. Finally feel like myself again.",
  "Very knowledgeable and explains everything clearly. The follow-up exercises have made a real difference.",
  "I appreciate how patient and non-judgmental the session was. Will definitely book again.",
  "Exceptional care. The doctor listened carefully and provided a personalised approach rather than generic advice.",
  "I was sceptical at first but the sessions genuinely helped me understand my thought patterns. Transformative.",
  "Extremely professional and compassionate. The session was thorough and I left feeling hopeful.",
  "Highly recommended. The doctor's expertise in trauma therapy is evident. I finally feel like I can heal.",
]

const SESSION_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"]

// ── Main Seed Function ────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting Psyspace demo data seed...\n")

  // Step 1: Create auth users + profiles for professionals
  const professionalIds = []

  for (const pro of PROFESSIONALS) {
    process.stdout.write(`Creating professional: ${pro.full_name}... `)
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: pro.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: pro.full_name, role: pro.role },
    })

    if (authError && !authError.message.includes("already been registered")) {
      console.error(`✗ Auth error: ${authError.message}`)
      continue
    }

    const userId = authData?.user?.id

    if (!userId) {
      // Try to find existing
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users?.find((u) => u.email === pro.email)
      if (!found) { console.log("✗ Could not find user"); continue }
      const profileId = found.id

      // Upsert profile
      await supabase.from("profiles").upsert({ id: profileId, full_name: pro.full_name, role: pro.role }, { onConflict: "id" })
      
      // Upsert professional profile
      const { data: profProfile } = await supabase
        .from("professional_profiles")
        .upsert({ user_id: profileId, ...pro.profile }, { onConflict: "user_id" })
        .select("id")
        .single()
      
      if (profProfile) professionalIds.push({ userId: profileId, profileId: profProfile.id, name: pro.full_name })
      console.log("⟳ Updated existing")
      continue
    }

    // Upsert profile
    await supabase.from("profiles").upsert({ id: userId, full_name: pro.full_name, role: pro.role }, { onConflict: "id" })

    // Create professional profile
    const { data: profProfile } = await supabase
      .from("professional_profiles")
      .upsert({ user_id: userId, ...pro.profile }, { onConflict: "user_id" })
      .select("id")
      .single()

    if (profProfile) professionalIds.push({ userId, profileId: profProfile.id, name: pro.full_name })
    console.log("✓")
    await sleep(300)
  }

  console.log(`\n✓ Created ${professionalIds.length} professional profiles\n`)

  // Step 2: Create session slots (next 21 days, multiple slots per day)
  console.log("Creating session slots...")
  let totalSlots = 0

  for (const pro of professionalIds) {
    const slots = []
    for (let day = 1; day <= 21; day++) {
      // Skip some days randomly for variety
      if (Math.random() < 0.25) continue
      const date = daysFromNow(day)
      const times = SESSION_TIMES.filter(() => Math.random() > 0.4)
      for (const time of times) {
        slots.push({
          professional_id: pro.profileId,
          session_date: date,
          start_time: time,
          duration_minutes: randomFrom([45, 60, 60, 90]),
          price: randomFrom([1400, 1500, 1600, 1800, 2000, 2200, 2500]),
          mode: randomFrom(["online", "online", "online", "offline"]),
          focus: randomFrom(["Initial Consultation", "Therapy Session", "Follow-up", "Assessment", "Consultation"]),
          status: "available",
        })
      }
    }
    const { error } = await supabase.from("professional_sessions").insert(slots)
    if (!error) totalSlots += slots.length
    else console.error(`  Session insert error for ${pro.name}: ${error.message}`)
  }
  console.log(`✓ Created ${totalSlots} session slots\n`)

  // Step 3: Create patient users + profiles
  console.log("Creating patient accounts...")
  const patientIds = []

  for (const patient of PATIENTS) {
    process.stdout.write(`  ${patient.full_name}... `)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: patient.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: patient.full_name, role: "patient" },
    })

    if (authError && !authError.message.includes("already been registered")) {
      console.error(`✗ ${authError.message}`)
      continue
    }

    const userId = authData?.user?.id
    if (!userId) {
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users?.find((u) => u.email === patient.email)
      if (found) {
        await supabase.from("profiles").upsert({ id: found.id, full_name: patient.full_name, role: "patient" }, { onConflict: "id" })
        patientIds.push(found.id)
        console.log("⟳ Updated")
      }
      continue
    }

    await supabase.from("profiles").upsert({ id: userId, full_name: patient.full_name, role: "patient" }, { onConflict: "id" })
    patientIds.push(userId)
    console.log("✓")
    await sleep(200)
  }

  console.log(`\n✓ Created ${patientIds.length} patient accounts\n`)

  // Step 4: Create bookings + reviews on past sessions
  // First get some available slots for each professional
  console.log("Creating bookings and reviews...")
  let bookingCount = 0
  let reviewCount = 0

  for (const pro of professionalIds) {
    // Get a few available slots for past-ish sessions
    const { data: slots } = await supabase
      .from("professional_sessions")
      .select("id")
      .eq("professional_id", pro.profileId)
      .eq("status", "available")
      .limit(6)

    if (!slots || slots.length === 0) continue

    for (let i = 0; i < Math.min(slots.length, 4); i++) {
      const patientId = patientIds[Math.floor(Math.random() * patientIds.length)]
      const slot = slots[i]

      // Create booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          patient_id: patientId,
          professional_id: pro.profileId,
          session_id: slot.id,
          price_paid: 1500,
          payment_status: "paid",
          status: "confirmed",
          payment_provider: "razorpay",
        })
        .select("id")
        .single()

      if (bookingError || !booking) continue

      // Mark session as booked
      await supabase.from("professional_sessions").update({ status: "booked" }).eq("id", slot.id)
      bookingCount++

      // 80% chance of leaving a review
      if (Math.random() < 0.8) {
        const rating = randomRating()
        await supabase.from("professional_reviews").insert({
          booking_id: booking.id,
          professional_id: pro.profileId,
          patient_id: patientId,
          rating,
          feedback: randomFrom(REVIEW_TEXTS),
        })
        reviewCount++
      }

      await sleep(100)
    }
  }

  console.log(`✓ Created ${bookingCount} bookings and ${reviewCount} reviews\n`)

  // Summary
  console.log("═══════════════════════════════════════")
  console.log("✅ Seed complete!")
  console.log(`   Professionals : ${professionalIds.length}`)
  console.log(`   Patients      : ${patientIds.length}`)
  console.log(`   Sessions      : ${totalSlots}`)
  console.log(`   Bookings      : ${bookingCount}`)
  console.log(`   Reviews       : ${reviewCount}`)
  console.log("\nLogin credentials for all accounts:")
  console.log("   Password: Psyspace@123")
  console.log("\nProfessional emails:")
  PROFESSIONALS.forEach((p) => console.log(`   ${p.email}`))
  console.log("\nPatient emails:")
  PATIENTS.forEach((p) => console.log(`   ${p.email}`))
  console.log("\nAdmin: create manually in Supabase Dashboard → Authentication → Users")
  console.log("  Then set role='admin' in the profiles table")
  console.log("═══════════════════════════════════════")
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
