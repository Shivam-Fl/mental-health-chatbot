/**
 * Security headers and input validation utilities
 */

import { NextResponse } from 'next/server';

/**
 * Applies security headers to responses
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), interest-cohort=()'
  );
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com wss://*.supabase.co",
    "media-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  return response;
}

/**
 * Sanitizes user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters and patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function isStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates conversation title
 */
export function isValidConversationTitle(title: string): boolean {
  return title.length > 0 && title.length <= 100;
}

/**
 * Validates message content
 */
export function isValidMessageContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > 5000) {
    return { valid: false, error: 'Message is too long (max 5000 characters)' };
  }
  
  return { valid: true };
}

/**
 * Checks if request is from authorized origin
 */
export function isAuthorizedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'https://*.vercel.app', // Vercel preview deployments
  ];
  
  return allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const regex = new RegExp(allowed.replace('*', '.*'));
      return regex.test(origin);
    }
    return origin === allowed;
  });
}

/**
 * Generates CORS headers for API responses
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
  
  if (origin && isAuthorizedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  return headers;
}

/**
 * Masks sensitive data for logging
 */
export function maskSensitiveData(data: string, showChars: number = 4): string {
  if (data.length <= showChars) {
    return '*'.repeat(data.length);
  }
  
  return data.slice(0, showChars) + '*'.repeat(data.length - showChars);
}

/**
 * Logs security events (for monitoring and audit)
 */
export function logSecurityEvent(event: {
  type: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'unauthorized_access';
  userId?: string;
  ip?: string;
  details?: string;
}): void {
  const timestamp = new Date().toISOString();
  
  // In production, send to logging service (e.g., Sentry, LogRocket)
  console.warn(`[SECURITY] ${timestamp} - ${event.type}`, {
    userId: event.userId,
    ip: event.ip ? maskSensitiveData(event.ip, 7) : undefined,
    details: event.details,
  });
  
  // TODO: Send to security monitoring service
}
