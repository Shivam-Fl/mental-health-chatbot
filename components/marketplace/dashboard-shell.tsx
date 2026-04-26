"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type React from "react"
import {
  BarChart3,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  HeartHandshake,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { useState } from "react"

import { createClient } from "@/lib/supabase/client"
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
  { href: "/dashboard/professional", label: "Overview", icon: Home, exact: true },
  { href: "/dashboard/professional/sessions", label: "Availability", icon: CalendarClock, exact: false },
  { href: "/dashboard/professional/verification", label: "Verification", icon: FileCheck2, exact: false },
  { href: "/dashboard/professional/settings", label: "Settings", icon: Settings, exact: false },
]

const patientLinks = [
  { href: "/dashboard/patient", label: "Find Care", icon: Home, exact: true },
]

const adminLinks = [
  { href: "/dashboard/admin", label: "Overview", icon: BarChart3, exact: true },
  { href: "/dashboard/admin/verification", label: "Verification Queue", icon: ClipboardList, exact: false },
  { href: "/dashboard/admin/approved", label: "Approved", icon: CheckCircle2, exact: false },
  { href: "/dashboard/admin/professionals", label: "All Professionals", icon: Users, exact: false },
]

const roleColorMap: Record<string, string> = {
  patient: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  psychiatrist: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  psychologist: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  admin: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function DashboardShell({ role, name, title, description, children }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const links = role === "admin" ? adminLinks : role === "patient" ? patientLinks : professionalLinks

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-3 group">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md group-hover:shadow-lg transition-shadow">
          <BrainCircuit className="size-5" />
        </div>
        <div>
          <p className="font-bold text-base leading-none tracking-tight">Psyspace</p>
          <p className="text-xs text-muted-foreground mt-0.5">Mental Health Platform</p>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {links.map((item) => {
          const active = isActive(item.href, item.exact)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
        <Link
          href="/chat"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <MessageCircle className="size-4 shrink-0" />
          AI Support Chat
        </Link>
      </nav>

      {/* User + Logout */}
      <div className="mt-auto space-y-2 pt-4 border-t border-border">
        <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
            {getInitials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${roleColorMap[role] ?? "bg-muted text-muted-foreground"}`}>
              {role}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <LogOut className="size-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card/50 backdrop-blur-sm p-4 md:flex flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Top Bar */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BrainCircuit className="size-4" />
          </div>
          <span className="font-bold text-sm">Psyspace</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </Button>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-card p-4 shadow-2xl">
            <div className="flex justify-end mb-4">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content */}
      <section className="md:pl-64">
        <header className="border-b border-border bg-background/90 px-4 py-5 backdrop-blur md:px-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{description}</p>
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </section>
    </main>
  )
}
