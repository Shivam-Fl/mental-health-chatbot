# Security Guide

This document outlines the security features implemented in the Aura Mental Health Chatbot and best practices for maintaining security.

## Table of Contents

1. [Security Features](#security-features)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Encryption](#data-encryption)
4. [API Security](#api-security)
5. [Security Headers](#security-headers)
6. [Best Practices](#best-practices)
7. [Security Checklist](#security-checklist)
8. [Incident Response](#incident-response)

## Security Features

### Implemented Security Measures

#### 1. Authentication & Authorization
- ✅ Supabase Auth with JWT tokens
- ✅ HTTP-only secure cookies
- ✅ Row-level security (RLS) in database
- ✅ Middleware-based route protection
- ✅ Session validation on every request

#### 2. Data Protection
- ✅ AES-256-GCM encryption for sensitive messages
- ✅ Password strength requirements
- ✅ Input sanitization and validation
- ✅ XSS protection
- ✅ SQL injection prevention (via Supabase client)

#### 3. API Security
- ✅ Rate limiting on all endpoints
- ✅ Request validation
- ✅ CORS protection
- ✅ Environment variable management
- ✅ API key protection

#### 4. Infrastructure Security
- ✅ HTTPS enforcement (production)
- ✅ Security headers (CSP, HSTS, etc.)
- ✅ Content Security Policy
- ✅ X-Frame-Options
- ✅ No credential exposure in logs

## Authentication & Authorization

### Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- At least one lowercase letter
- At least one uppercase letter
- At least one number
- At least one special character

Implementation in `lib/security.ts`:
```typescript
import { isStrongPassword } from '@/lib/security'

const validation = isStrongPassword(password)
if (!validation.valid) {
  // Show validation.errors to user
}
```

### Session Management

- Sessions use HTTP-only cookies (prevents XSS attacks)
- Automatic session refresh
- Session expiry after inactivity
- Secure session storage

### Row-Level Security (RLS)

Database access is restricted at the row level:
- Users can only access their own conversations
- Users can only read/write their own messages
- All queries automatically filtered by user_id

## Data Encryption

### Chat Message Encryption

Sensitive messages are encrypted using AES-256-GCM:

```typescript
import { encryptMessage, decryptMessage } from '@/lib/encryption'

// Encrypt before storing
const encrypted = encryptMessage(message)

// Decrypt when retrieving
const decrypted = decryptMessage(encrypted)
```

### Encryption Key Management

- Store `CHAT_ENCRYPTION_KEY` as environment variable
- Generate using: `openssl rand -base64 32`
- Never commit encryption keys to version control
- Rotate keys periodically

### What Gets Encrypted

- Sensitive user messages (opt-in)
- Personal health information
- Crisis-related conversations

### What Doesn't Get Encrypted

- Public metadata (conversation titles, timestamps)
- Emotion detection results (for analytics)
- System messages

## API Security

### Rate Limiting

Rate limits protect against abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Chat API | 30 req | 1 min |
| Emotion Analysis | 20 req | 1 min |
| Auth endpoints | 5 req | 15 min |
| General API | 60 req | 1 min |
| Video endpoints | 10 req | 1 min |

Configure in `lib/rate-limit.ts`:
```typescript
export const RATE_LIMITS = {
  chat: { windowMs: 60 * 1000, maxRequests: 30 },
  // ... other limits
}
```

### Input Validation

All user inputs are validated:

```typescript
import { sanitizeInput, isValidMessageContent } from '@/lib/security'

// Sanitize to remove malicious content
const clean = sanitizeInput(userInput)

// Validate format and length
const validation = isValidMessageContent(clean)
if (!validation.valid) {
  return { error: validation.error }
}
```

### API Authentication

All API routes verify authentication:

```typescript
const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

## Security Headers

### Content Security Policy (CSP)

Prevents XSS attacks by restricting resource loading:

```
default-src 'self'
script-src 'self' 'unsafe-eval' 'unsafe-inline'
style-src 'self' 'unsafe-inline'
img-src 'self' data: https: blob:
connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com
```

### HTTP Strict Transport Security (HSTS)

Forces HTTPS in production:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### Other Security Headers

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Restricts browser features

Applied in `middleware.ts` via `applySecurityHeaders()`.

## Best Practices

### For Developers

1. **Never Commit Secrets**
   - Use `.env.local` for local development
   - Add `.env*` to `.gitignore`
   - Use environment variables in production

2. **Keep Dependencies Updated**
   ```bash
   npm audit
   npm audit fix
   ```

3. **Review Code for Vulnerabilities**
   - Check for SQL injection risks
   - Validate all user inputs
   - Sanitize outputs
   - Use parameterized queries

4. **Implement Least Privilege**
   - Grant minimum necessary permissions
   - Use RLS policies
   - Limit API access

5. **Log Security Events**
   ```typescript
   import { logSecurityEvent } from '@/lib/security'
   
   logSecurityEvent({
     type: 'unauthorized_access',
     userId: user?.id,
     details: 'Failed login attempt'
   })
   ```

### For Operators

1. **Monitor Logs**
   - Check for suspicious patterns
   - Review failed authentication attempts
   - Monitor rate limit violations

2. **Regular Backups**
   - Enable Supabase automated backups
   - Test restoration procedures
   - Store backups securely

3. **Access Control**
   - Use strong passwords for admin accounts
   - Enable 2FA where possible
   - Review access logs regularly

4. **Incident Response Plan**
   - Document procedures
   - Assign responsibilities
   - Test response procedures

## Security Checklist

### Development

- [ ] All API endpoints validate authentication
- [ ] User inputs are sanitized
- [ ] Passwords meet strength requirements
- [ ] Sensitive data is encrypted
- [ ] No secrets in code or version control
- [ ] Error messages don't leak sensitive info
- [ ] Rate limiting is implemented
- [ ] CORS is properly configured

### Pre-Deployment

- [ ] All environment variables set
- [ ] Database RLS policies tested
- [ ] Security headers verified
- [ ] SSL/TLS certificate configured
- [ ] API keys rotated
- [ ] Dependencies updated
- [ ] Security audit completed

### Post-Deployment

- [ ] Health check endpoint responds
- [ ] Authentication flow works
- [ ] Rate limiting is active
- [ ] Security headers present
- [ ] HTTPS enforced
- [ ] Logs are being collected
- [ ] Monitoring is active

### Ongoing Maintenance

- [ ] Weekly log reviews
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] API key rotation (90 days)
- [ ] Backup testing
- [ ] Incident response drills

## Incident Response

### If You Suspect a Security Breach

1. **Immediate Actions**
   - Document everything
   - Don't delete evidence
   - Contain the breach
   - Notify stakeholders

2. **Investigation**
   - Review logs
   - Identify affected systems
   - Determine scope
   - Preserve evidence

3. **Remediation**
   - Patch vulnerabilities
   - Rotate compromised credentials
   - Update security measures
   - Monitor for further activity

4. **Communication**
   - Notify affected users
   - Report to authorities (if required)
   - Document lessons learned
   - Update procedures

### Emergency Contacts

- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Google Cloud Security: https://cloud.google.com/security

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do Not** open a public GitHub issue
2. Email security concerns to: [your-security-email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours.

## Compliance

### HIPAA Considerations

⚠️ **Important**: This application is NOT HIPAA-compliant out of the box. If you need HIPAA compliance:

- Use Supabase Enterprise with BAA
- Implement additional audit logging
- Add data retention policies
- Conduct regular risk assessments
- Train staff on HIPAA requirements

### GDPR Considerations

For EU users:
- Implement data export functionality
- Add data deletion capabilities
- Create privacy policy
- Enable consent management
- Document data processing

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Security is everyone's responsibility. If you see something, say something.**

Last Updated: January 2024
