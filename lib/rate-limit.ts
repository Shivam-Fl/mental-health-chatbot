/**
 * Rate limiting utilities for API endpoints
 * Prevents abuse and ensures fair usage
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

// Default rate limit configurations
export const RATE_LIMITS = {
  chat: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  video: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 requests per minute (resource intensive)
  emotion: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 requests per minute
};

/**
 * Cleans up expired entries from the rate limit store
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Checks if a request is within rate limits
 * @param identifier Unique identifier (e.g., user ID, IP address)
 * @param config Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const key = identifier;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetTime < now) {
    // Create new entry or reset expired one
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newEntry.resetTime,
    };
  }
  
  // Entry exists and is valid
  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }
  
  // Rate limit exceeded
  return {
    allowed: false,
    remaining: 0,
    resetTime: entry.resetTime,
    retryAfter: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Express/Next.js middleware for rate limiting
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return async (req: Request): Promise<Response | null> => {
    // Get identifier (user ID from auth, or IP as fallback)
    const identifier = getRequestIdentifier(req);
    
    const result = checkRateLimit(identifier, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': result.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          },
        }
      );
    }
    
    // Request allowed, continue
    return null;
  };
}

/**
 * Gets a unique identifier for the request
 */
function getRequestIdentifier(req: Request): string {
  // Try to get user ID from headers (set by auth middleware)
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
  return `ip:${ip}`;
}

/**
 * Resets rate limit for a specific identifier (useful for testing or admin actions)
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Gets current rate limit status for an identifier
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig
): {
  requestsUsed: number;
  requestsRemaining: number;
  resetTime: number;
} {
  const entry = rateLimitStore.get(identifier);
  const now = Date.now();
  
  if (!entry || entry.resetTime < now) {
    return {
      requestsUsed: 0,
      requestsRemaining: config.maxRequests,
      resetTime: now + config.windowMs,
    };
  }
  
  return {
    requestsUsed: entry.count,
    requestsRemaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}
