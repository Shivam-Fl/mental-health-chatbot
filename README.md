# Aura - Mental Health Chatbot

A professional, production-ready mental health support application with AI-powered conversations, emotion detection, and comprehensive security features.

## Features

### 🤖 AI-Powered Conversations
- Multi-modal chat support (text, audio, video)
- Context-aware responses using Google's Gemini AI
- Empathetic and supportive conversation design
- Bilingual support (English/Hindi)

### 🧠 Mental Health Support
- Real-time emotion detection
- Facial expression analysis
- Crisis detection and emergency resources
- Session analytics and progress tracking
- Coping strategies for various emotional states

### 🔒 Security & Privacy
- End-to-end message encryption (AES-256-GCM)
- Rate limiting on all API endpoints
- Comprehensive security headers (CSP, HSTS, etc.)
- Input sanitization and validation
- Secure authentication with Supabase
- Password strength requirements

### 💎 Professional UI/UX
- Modern, responsive design with Tailwind CSS
- Dark mode support
- Loading states and error handling
- Accessible components (Radix UI)
- Mobile-optimized experience

## Tech Stack

- **Framework**: Next.js 14 (React 18, TypeScript)
- **Styling**: Tailwind CSS 4, Radix UI
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **AI/ML**: Google Generative AI (Gemini), face-api.js
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- A Supabase account and project
- A Google Cloud account with Gemini API access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Shivam-Fl/mental-health-chatbot.git
cd mental-health-chatbot
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google AI Configuration
GOOGLE_API_KEY=your_google_gemini_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/

# Encryption Key (generate with: openssl rand -base64 32)
CHAT_ENCRYPTION_KEY=your_generated_32_byte_key
```

### Database Setup

1. Run SQL scripts in order from the `scripts/` folder: `001_create_tables.sql`, `002_create_profile_trigger.sql`, then `003_marketplace.sql`.

2. If you prefer manual setup instead of scripts, create the following tables in your Supabase project:

```sql
-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'video')),
  emotion_detected TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emotion analyses table
CREATE TABLE emotion_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  primary_emotion TEXT NOT NULL,
  confidence_score FLOAT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only access messages from their conversations
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can only access their emotion analyses
CREATE POLICY "Users can view own emotion analyses" ON emotion_analyses
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own emotion analyses" ON emotion_analyses
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );
```

3. The marketplace extension SQL (`scripts/003_marketplace.sql`) enables:
   - role-based profiles (patient, psychiatrist, psychologist)
   - professional session listings
   - paid booking records
   - ratings/feedback
   - social posts/shorts

4. Enable email authentication in your Supabase project settings.

### Running Locally

```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables from `.env.local`
4. Deploy!

```bash
# Using Vercel CLI
npm install -g vercel
vercel
```

### Environment Variables for Production

Make sure to set these in your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_API_KEY`
- `NEXT_PUBLIC_APP_URL` (your production URL)
- `CHAT_ENCRYPTION_KEY` (generate a secure key)

### Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test authentication flows
- [ ] Test chat functionality (text, audio, video)
- [ ] Verify database connections
- [ ] Check security headers with securityheaders.com
- [ ] Test rate limiting
- [ ] Verify crisis detection and resources
- [ ] Test on multiple devices and browsers

## Security Features

### Implemented Security Measures

1. **Authentication & Authorization**
   - Supabase Auth with JWT tokens
   - Row-level security (RLS) in database
   - Middleware-based route protection

2. **Data Protection**
   - AES-256-GCM encryption for sensitive messages
   - HTTP-only secure cookies
   - Input sanitization and validation

3. **API Security**
   - Rate limiting (30 req/min for chat, 20 req/min for emotion analysis)
   - Environment variable management
   - CORS protection

4. **HTTP Security Headers**
   - Content Security Policy (CSP)
   - X-Frame-Options
   - X-Content-Type-Options
   - HSTS (production)
   - Permissions Policy

5. **Password Security**
   - Strong password requirements
   - Password visibility toggle
   - Confirmation validation

### Security Best Practices

- Never commit `.env.local` or any files containing secrets
- Rotate API keys regularly
- Monitor rate limit violations
- Review Supabase RLS policies
- Keep dependencies updated
- Use HTTPS in production

## Development

### Project Structure

```
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── auth/            # Authentication pages
│   ├── chat/            # Chat interface
│   └── dashboard/       # Analytics dashboard
├── components/          # React components
│   ├── ui/             # UI primitives (Radix)
│   └── chat/           # Chat-specific components
├── lib/                # Utility libraries
│   ├── supabase/       # Supabase clients
│   ├── encryption.ts   # Encryption utilities
│   ├── rate-limit.ts   # Rate limiting
│   └── security.ts     # Security helpers
└── public/             # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support & Resources

### Crisis Resources

If you or someone you know is in crisis, please contact:
- **US**: 988 Suicide & Crisis Lifeline
- **Text**: HOME to 741741 (Crisis Text Line)
- **International**: [IASP Crisis Centers](https://www.iasp.info/resources/Crisis_Centres/)

### Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Powered by [Google Gemini AI](https://deepmind.google/technologies/gemini/)
- Authentication by [Supabase](https://supabase.com/)

---

**Note**: This application is designed to provide emotional support and is not a substitute for professional mental health care. Always consult with qualified healthcare providers for medical advice.
