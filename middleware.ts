import { updateSession } from "@/lib/supabase/middleware"
import { applySecurityHeaders } from "@/lib/security"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Update session and get response
  const response = await updateSession(request)
  
  // Apply security headers to the response
  const securedResponse = applySecurityHeaders(response)
  
  return securedResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
