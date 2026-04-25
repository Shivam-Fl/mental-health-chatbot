import Image from "next/image"
import Link from "next/link"
import {
  BadgeCheck,
  CalendarClock,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  HeartHandshake,
  LockKeyhole,
  type LucideIcon,
  MessageCircle,
  ShieldCheck,
  Star,
  Stethoscope,
  UserRoundCheck,
  Video,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const marketplaceStats = [
  { label: "Professional verification", value: "Required" },
  { label: "Patient booking flow", value: "Paid" },
  { label: "Online sessions", value: "Built in" },
]

const patientFlow = [
  "Search verified psychiatrists and psychologists by specialty, city, and availability.",
  "Pay for a session and keep booking status, reminders, and meeting links in one dashboard.",
  "Attend online, then leave ratings and feedback after completed care.",
]

const professionalFlow = [
  "Create a practice profile with specialty, city, fees, qualifications, and payment details.",
  "Upload degree, license, and qualification documents for admin review.",
  "Publish availability only after approval, then manage bookings and session attendance.",
]

const platformCapabilities = [
  {
    title: "Verification before marketplace access",
    body: "Professionals cannot accept paid sessions until an admin approves their submitted documents.",
    icon: FileCheck2,
  },
  {
    title: "Separate role dashboards",
    body: "Patients, professionals, and admins each land in a dashboard shaped around their real work.",
    icon: ClipboardCheck,
  },
  {
    title: "Payments and attendance",
    body: "Razorpay-ready booking, manual payment fallback, online join links, and attendance tracking.",
    icon: CreditCard,
  },
  {
    title: "AI support stays secondary",
    body: "The chatbot remains available as support from the app, without replacing the care marketplace.",
    icon: MessageCircle,
  },
]

const roleDashboards: Array<{ title: string; body: string; Icon: LucideIcon }> = [
  {
    title: "Patient dashboard",
    body: "Browse verified care, book sessions, join appointments, submit reviews.",
    Icon: Video,
  },
  {
    title: "Professional dashboard",
    body: "Submit verification, manage settings, publish sessions, track bookings.",
    Icon: BadgeCheck,
  },
  {
    title: "Admin dashboard",
    body: "Review professional documents and approve or reject marketplace access.",
    Icon: LockKeyhole,
  },
]

export function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartHandshake className="size-5" />
            </div>
            <span className="text-lg font-semibold">Aura Care</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#patients" className="hover:text-foreground">
              Patients
            </a>
            <a href="#professionals" className="hover:text-foreground">
              Professionals
            </a>
            <a href="#trust" className="hover:text-foreground">
              Trust
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[78svh] overflow-hidden border-b border-border pt-20">
        <Image src="/placeholder.jpg" alt="Private online mental health consultation workspace" fill priority className="object-cover opacity-35" />
        <div className="absolute inset-0 bg-background/75" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_85%_25%,rgba(34,197,94,0.12),transparent_28%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.08fr_0.92fr] md:px-6 lg:py-20">
          <div className="flex flex-col justify-center">
            <Badge variant="outline" className="mb-5 h-8 w-fit border-primary/40 bg-background/70 text-primary">
              Verified mental health marketplace
            </Badge>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-normal text-balance md:text-7xl">
              Aura Care
            </h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-foreground md:text-2xl">
              A professional marketplace for booking paid sessions with verified psychiatrists and psychologists.
            </p>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Patients discover trusted care. Professionals manage verified practices. Admins review credentials before
              any professional can accept sessions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-md">
                <Link href="/auth/signup">
                  <UserRoundCheck className="mr-2 size-4" />
                  Create account
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-md bg-background/70">
                <Link href="/auth/login">
                  <CalendarClock className="mr-2 size-4" />
                  Open dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid content-end gap-4">
            <div className="rounded-md border border-border bg-background/88 p-5 shadow-xl backdrop-blur">
              <div className="flex items-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="font-semibold">Credential-first onboarding</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Degree and license documents are uploaded to a private bucket, reviewed by an admin, and only then
                    does session publishing unlock.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {marketplaceStats.map((stat) => (
                <div key={stat.label} className="rounded-md border border-border bg-background/88 p-4 backdrop-blur">
                  <p className="text-lg font-semibold">{stat.value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-2 md:px-6" id="patients">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UserRoundCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">For patients</p>
              <h2 className="text-2xl font-semibold tracking-normal">Book care with confidence</h2>
            </div>
          </div>
          <div className="space-y-4">
            {patientFlow.map((item, index) => (
              <div key={item} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-6" id="professionals">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">For professionals</p>
              <h2 className="text-2xl font-semibold tracking-normal">Run a verified practice</h2>
            </div>
          </div>
          <div className="space-y-4">
            {professionalFlow.map((item, index) => (
              <div key={item} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/20" id="trust">
        <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
          <div className="mb-7 max-w-3xl">
            <p className="text-sm font-medium text-primary">Marketplace infrastructure</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-normal">
              The product is organized around trust, booking, and care delivery.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {platformCapabilities.map((feature) => (
              <Card key={feature.title} className="rounded-md">
                <CardHeader>
                  <feature.icon className="mb-3 size-6 text-primary" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-[0.9fr_1.1fr] md:px-6">
        <div>
          <p className="text-sm font-medium text-primary">What users see after login</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-normal">Separate dashboards for real operations</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            The public page stays focused on conversion. Work happens after authentication in role-specific dashboards.
          </p>
        </div>
        <div className="grid gap-3">
          {roleDashboards.map(({ title, body, Icon }) => (
            <div key={String(title)} className="flex gap-4 rounded-md border border-border bg-card p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <p>Aura Care is a booking platform for mental health sessions, not emergency care.</p>
          <p>In crisis, call local emergency services or a crisis line immediately.</p>
        </div>
      </footer>
    </main>
  )
}
