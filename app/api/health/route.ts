/**
 * Health check endpoint for monitoring
 */

export async function GET() {
  // Basic health check
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  }

  // Check critical environment variables
  const missingVars: string[] = []
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  
  if (!process.env.VERTEX_AI_API_KEY) {
    missingVars.push('VERTEX_AI_API_KEY')
  }

  if (missingVars.length > 0) {
    return Response.json(
      {
        ...health,
        status: 'unhealthy',
        errors: [`Missing environment variables: ${missingVars.join(', ')}`],
      },
      { status: 503 }
    )
  }

  return Response.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
