# GitHub Copilot Instructions for Aura Mental Health Chatbot

## Project Overview

This is **Aura**, a professional mental health support application with AI-powered conversations, emotion detection, and comprehensive security features. The application provides empathetic support and is NOT a substitute for professional mental health care.

### Purpose
- Provide emotional support through AI-powered conversations
- Detect and respond to user emotions
- Offer coping strategies and resources
- Track mental health progress over time
- Provide crisis resources when needed

### Critical Considerations
- **User Safety First**: Always prioritize user safety and well-being
- **Empathetic Responses**: Maintain a supportive and non-judgmental tone
- **Crisis Detection**: Implement proper crisis detection and resource provision
- **Privacy & Security**: Handle sensitive mental health data with utmost care
- **Not Medical Advice**: Never provide medical diagnoses or treatment recommendations

## Tech Stack

### Core Technologies
- **Framework**: Next.js 15 with App Router (React 18)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4, Radix UI components
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (JWT-based)
- **AI/ML**: Google Generative AI (Gemini API), face-api.js
- **Deployment**: Vercel (recommended)

### Key Dependencies
- `@google/generative-ai` - AI-powered conversations
- `@supabase/supabase-js` - Database and auth
- `face-api.js` - Emotion detection
- `react-hook-form` + `zod` - Form validation
- `lucide-react` - Icons

## Code Style and Conventions

### TypeScript Guidelines
- Use TypeScript for all new files
- Enable strict mode (`"strict": true` in tsconfig.json)
- Define proper types and interfaces; avoid `any`
- Use type inference where appropriate
- Prefer interfaces for object shapes, types for unions/primitives

### React/Next.js Patterns
- Use React Server Components (RSC) by default
- Add `'use client'` directive only when needed (hooks, event handlers, browser APIs)
- Use async/await for Server Components data fetching
- Implement proper loading and error states
- Use Next.js App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`)
- Organize API routes under `app/api/`

### Component Structure
```typescript
// components/example-component.tsx
'use client' // Only if needed

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface ExampleComponentProps {
  title: string
  onAction?: () => void
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  // Component logic
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

### File Organization
- **Components**: Place in `components/` directory
  - UI primitives: `components/ui/` (Radix-based)
  - Feature components: `components/chat/`, etc.
- **Utilities**: Place in `lib/` directory
- **Types**: Place in `types/` directory or co-locate with components
- **API Routes**: Place in `app/api/`
- **Pages**: Place in `app/` using App Router structure

### Naming Conventions
- **Components**: PascalCase (`ChatMessage`, `EmotionDetector`)
- **Files**: kebab-case for pages/routes, PascalCase for components
- **Functions**: camelCase (`handleSubmit`, `fetchMessages`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINT`, `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `ChatMessage`)

## Security Best Practices

### Critical Security Requirements
1. **Never commit secrets or API keys** to the repository
2. **Always use environment variables** for sensitive configuration
3. **Implement rate limiting** on all API endpoints (already in place)
4. **Validate and sanitize all user inputs** before processing
5. **Use Row-Level Security (RLS)** for database operations
6. **Encrypt sensitive data** using the encryption utilities in `lib/encryption.ts`
7. **Follow OWASP security guidelines** for web applications

### Authentication & Authorization
- Use Supabase client with proper auth context
- Check authentication status in middleware
- Implement proper session validation
- Use RLS policies to restrict data access
- Never expose user data across accounts

### Data Protection
- Encrypt sensitive messages using `lib/encryption.ts`
- Use HTTPS in production (automatic with Vercel)
- Implement proper CORS policies
- Set secure HTTP headers (see `middleware.ts`)
- Use HTTP-only cookies for sensitive tokens

### API Security
- Apply rate limiting to all endpoints (use `lib/rate-limit.ts`)
- Validate request payloads with Zod schemas
- Return appropriate error codes (don't expose internal details)
- Log security-relevant events
- Monitor for suspicious activity

### Example: Secure API Route
```typescript
// app/api/example/route.ts
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const requestSchema = z.object({
  message: z.string().min(1).max(1000),
})

export async function POST(request: Request) {
  // Apply rate limiting
  const rateLimitResult = await rateLimit(request)
  if (!rateLimitResult.success) {
    return new Response('Too many requests', { status: 429 })
  }

  // Validate authentication
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Validate request body
  const body = await request.json()
  const validation = requestSchema.safeParse(body)
  if (!validation.success) {
    return new Response('Invalid request', { status: 400 })
  }

  // Process request securely
  // ...
}
```

## Testing Guidelines

### Testing Approach
- **Manual Testing**: Test all features manually before committing
- **Test Authentication**: Verify auth flows work correctly
- **Test Rate Limiting**: Ensure rate limits are enforced
- **Test Error Handling**: Verify graceful error handling
- **Test Accessibility**: Ensure UI is accessible (keyboard navigation, screen readers)

### When Adding New Features
1. Test the happy path (expected usage)
2. Test error conditions (invalid inputs, network errors)
3. Test edge cases (empty states, maximum limits)
4. Test on different devices and browsers
5. Verify security measures are in place

### ESLint
- Run `npm run lint` before committing
- Fix all linting errors and warnings
- Follow Next.js and React best practices

## Development Workflow

### Environment Setup
1. Copy `.env.example` to `.env.local`
2. Fill in all required environment variables
3. Set up Supabase project and database schema
4. Obtain Google Gemini API key

### Required Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI Configuration
GOOGLE_API_KEY=your_google_gemini_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/chat

# Encryption (generate with: openssl rand -base64 32)
CHAT_ENCRYPTION_KEY=your_generated_32_byte_key
```

### Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Git Workflow
1. Create feature branch from `main`
2. Make small, focused commits
3. Write descriptive commit messages
4. Test changes locally
5. Push and create pull request
6. Address review feedback

## AI and Mental Health Considerations

### Conversation Guidelines
- **Empathy**: Always maintain an empathetic, supportive tone
- **Non-judgmental**: Never judge user emotions or situations
- **Active Listening**: Acknowledge user feelings before responding
- **Boundaries**: Clarify limitations (not medical advice, not therapy)
- **Crisis Response**: Provide immediate crisis resources when needed

### Prompt Engineering
- Use prompts from `lib/mental-health-prompts.ts`
- Maintain context across conversations
- Provide actionable coping strategies
- Offer validation and support
- Redirect to professional help when appropriate

### Crisis Detection
- Monitor for keywords indicating crisis (suicide, self-harm, etc.)
- Immediately provide crisis hotline information
- Log crisis interactions for review
- Never minimize or dismiss crisis situations

## UI/UX Guidelines

### Design Principles
- **Accessibility First**: Support keyboard navigation, screen readers
- **Responsive Design**: Mobile-first approach
- **Dark Mode**: Implement using `next-themes`
- **Loading States**: Show loading indicators for async operations
- **Error Messages**: Display user-friendly error messages
- **Empty States**: Handle empty states gracefully

### Radix UI Components
- Use Radix UI primitives from `components/ui/`
- Follow existing component patterns
- Maintain consistent styling with Tailwind
- Ensure components are accessible by default

### Styling
- Use Tailwind CSS utility classes
- Follow existing spacing and color conventions
- Use CSS variables for theming (defined in `globals.css`)
- Prefer composition over custom CSS

## API Integration

### Google Gemini AI
- Use the Gemini API for conversational responses
- Implement proper error handling and retries
- Set appropriate safety settings
- Manage context and conversation history
- Handle rate limits gracefully

### Supabase
- Use server-side client for authenticated operations
- Use client-side client for real-time subscriptions
- Implement proper error handling
- Respect RLS policies
- Use type-safe queries

### Example: Using Supabase
```typescript
import { createClient } from '@/lib/supabase/server'

// Server-side usage
const supabase = createClient()
const { data, error } = await supabase
  .from('conversations')
  .select('*')
  .eq('user_id', user.id)

if (error) {
  // Handle error
}
```

## Error Handling

### Error Handling Strategy
- Use try-catch blocks for async operations
- Provide meaningful error messages to users
- Log errors for debugging (without exposing sensitive data)
- Implement graceful degradation
- Show appropriate error UI components

### Example: Error Handling
```typescript
try {
  const result = await performOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  // Don't expose internal error details to users
  return { error: 'An error occurred. Please try again.' }
}
```

## Performance Considerations

- **Code Splitting**: Use dynamic imports for large components
- **Image Optimization**: Use Next.js `Image` component
- **API Caching**: Implement appropriate caching strategies
- **Database Queries**: Optimize queries and use indexes
- **Bundle Size**: Monitor and minimize bundle size

## Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Mental Health Resources
- Crisis Text Line: Text HOME to 741741
- National Suicide Prevention Lifeline: 988
- SAMHSA's National Helpline: 1-800-662-4357
- International Association for Suicide Prevention: https://www.iasp.info/

## Important Reminders

1. **This is a support tool, not therapy**: Never position responses as professional medical advice
2. **User safety is paramount**: Implement crisis detection and provide resources
3. **Privacy is critical**: Handle mental health data with extreme care
4. **Security cannot be compromised**: Follow all security best practices
5. **Test thoroughly**: Mental health applications require extra attention to testing
6. **Be empathetic**: Every interaction should be supportive and non-judgmental

---

**Note**: When in doubt about mental health best practices or ethical considerations, consult with mental health professionals or refer to established guidelines from organizations like SAMHSA or the APA.
