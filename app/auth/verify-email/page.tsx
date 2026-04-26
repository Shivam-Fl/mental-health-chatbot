import { redirect } from "next/navigation"

// Email verification is disabled — redirect straight to login
export default function VerifyEmailPage() {
  redirect("/auth/login")
}
