# Deployment Guide - Aura Mental Health Chatbot

This guide provides step-by-step instructions for deploying the Aura mental health chatbot to production.

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Supabase project created and configured
- [ ] Google Cloud project with Gemini API enabled
- [ ] All environment variables ready
- [ ] Database schema created
- [ ] Generated encryption key

## Environment Setup

### 1. Supabase Configuration

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to Project Settings > API
3. Copy your project URL and anon key
4. Set up authentication:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure email templates (optional)

### 2. Google Gemini API

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Save the API key securely

### 3. Generate Encryption Key

```bash
openssl rand -base64 32
```

Save this key - you'll need it for `CHAT_ENCRYPTION_KEY`.

## Database Setup

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'audio', 'video')),
  emotion_detected TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emotion analyses table
CREATE TABLE emotion_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  primary_emotion TEXT NOT NULL,
  confidence_score FLOAT,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_emotion_analyses_conversation_id ON emotion_analyses(conversation_id);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages
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

-- RLS Policies for emotion analyses
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

## Deployment to Vercel

### Method 1: Using Vercel Dashboard (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Add Environment Variables**
   
   In Vercel Dashboard > Settings > Environment Variables, add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GOOGLE_API_KEY=your_google_api_key
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   CHAT_ENCRYPTION_KEY=your_generated_encryption_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

### Method 2: Using Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Add Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add GOOGLE_API_KEY
   vercel env add NEXT_PUBLIC_APP_URL
   vercel env add CHAT_ENCRYPTION_KEY
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Post-Deployment Verification

### 1. Health Check

Visit `https://your-app.vercel.app/api/health`

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### 2. Test Authentication

1. Visit your app URL
2. Click "Get Started"
3. Create a test account
4. Verify email confirmation works
5. Login successfully

### 3. Test Chat Functionality

1. Create a new conversation
2. Send a text message
3. Verify AI response
4. Check emotion detection

### 4. Security Verification

Run security checks:

1. **SSL/TLS**: Visit [SSL Labs](https://www.ssllabs.com/ssltest/)
2. **Security Headers**: Visit [Security Headers](https://securityheaders.com/)
3. **Rate Limiting**: Test API endpoints with multiple rapid requests

### 5. Performance Testing

1. **Lighthouse**: Run in Chrome DevTools
   - Target scores: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+

2. **WebPageTest**: Visit [webpagetest.org](https://www.webpagetest.org/)
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3.5s

## Monitoring & Maintenance

### Vercel Analytics

Enable in Vercel Dashboard:
- Real-time performance monitoring
- User analytics
- Error tracking

### Supabase Monitoring

Check in Supabase Dashboard:
- Database usage
- API requests
- Active users
- Storage usage

### Set Up Alerts

1. **Vercel Alerts**
   - Deployment failures
   - High error rates
   - Performance degradation

2. **Supabase Alerts**
   - Database size limits
   - API rate limits
   - Authentication errors

## Scaling Considerations

### Rate Limiting

Current limits (per user):
- Chat: 30 requests/minute
- Emotion Analysis: 20 requests/minute
- General API: 60 requests/minute

Adjust in `lib/rate-limit.ts` if needed.

### Database Performance

Monitor these metrics:
- Query response time
- Connection pool usage
- Table sizes

Consider:
- Adding more indexes for large datasets
- Implementing data archival for old conversations
- Using read replicas for analytics

### Caching

Implement caching for:
- Static assets (automatic with Vercel)
- API responses (where appropriate)
- Conversation lists

## Troubleshooting

### Build Failures

**Issue**: `next/font` error
**Solution**: Ensure network allows googleapis.com, or use local fonts (Geist is configured)

**Issue**: Missing environment variables
**Solution**: Check all variables are set in Vercel dashboard

### Runtime Errors

**Issue**: Database connection errors
**Solution**: Verify Supabase credentials and RLS policies

**Issue**: API rate limiting
**Solution**: Check rate limit configuration and user load

### Security Issues

**Issue**: CORS errors
**Solution**: Check allowed origins in `lib/security.ts`

**Issue**: Authentication failures
**Solution**: Verify Supabase auth configuration and redirect URLs

## Rollback Procedure

If deployment has issues:

1. **Vercel Dashboard**: Go to Deployments > Previous deployment > Promote to Production
2. **Vercel CLI**: `vercel rollback`

## Support

For issues:
- Check [Next.js Documentation](https://nextjs.org/docs)
- Check [Supabase Documentation](https://supabase.com/docs)
- Review application logs in Vercel Dashboard
- Check browser console for client-side errors

## Security Best Practices

- [ ] Rotate API keys every 90 days
- [ ] Monitor for unusual activity
- [ ] Keep dependencies updated
- [ ] Review security headers quarterly
- [ ] Backup database regularly
- [ ] Test disaster recovery procedures
- [ ] Review RLS policies regularly
- [ ] Monitor rate limiting logs

## Maintenance Schedule

**Weekly**:
- Check error logs
- Monitor performance metrics
- Review user feedback

**Monthly**:
- Update dependencies
- Review security settings
- Analyze usage patterns

**Quarterly**:
- Security audit
- Performance optimization review
- Feature usage analysis
- Capacity planning

---

**Last Updated**: January 2024
**Version**: 1.0.0
