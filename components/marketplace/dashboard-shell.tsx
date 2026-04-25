import Link from "next/link"
import type React from "react"
import { CalendarClock, FileCheck2, HeartHandshake, Home, MessageCircle, Settings, ShieldCheck, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type DashboardShellProps = {
  role: string
  name: string
  title: string
  description: string
  children: React.ReactNode
}

const professionalLinks = [
  { href: "/dashboard/professional", label: "Overview", icon: Home },
  { href: "/dashboard/professional/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/dashboard/professional/verification", label: "Verification", icon: FileCheck2 },
  { href: "/dashboard/professional/settings", label: "Settings", icon: Settings },
]

const patientLinks = [{ href: "/dashboard/patient", label: "Care dashboard", icon: Home }]
const adminLinks = [{ href: "/dashboard/admin/verification", label: "Verification queue", icon: ShieldCheck }]

export function DashboardShell({ role, name, title, description, children }: DashboardShellProps) {
  const links = role === "admin" ? adminLinks : role === "patient" ? patientLinks : professionalLinks

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card/40 p-4 md:block">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HeartHandshake className="size-5" />
          </div>
          <div>
            <p className="font-semibold leading-none">Aura Care</p>
            <p className="text-xs text-muted-foreground">Dashboard</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {links.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="h-10 w-full justify-start rounded-md">
              <Link href={item.href}>
                <item.icon className="mr-2 size-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Button asChild variant="outline" className="w-full justify-start rounded-md">
            <Link href="/chat">
              <MessageCircle className="mr-2 size-4" />
              AI support
            </Link>
          </Button>
          <Badge variant="secondary" className="h-9 w-full justify-start px-3">
            <UserRound className="size-3.5" />
            {name}
          </Badge>
        </div>
      </aside>

      <section className="md:pl-64">
        <header className="border-b border-border bg-background/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <Badge variant="outline" className="mb-2 capitalize">
                {role}
              </Badge>
              <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex gap-2 md:hidden">
              {links.map((item) => (
                <Button key={item.href} asChild size="sm" variant="outline">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </section>
    </main>
  )
}
