-- Marketplace schema for professionals, paid sessions, bookings, reviews, and posts.
-- Run after 001_create_tables.sql and 002_create_profile_trigger.sql.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'patient';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('patient', 'psychiatrist', 'psychologist', 'admin'));

UPDATE public.profiles
SET role = COALESCE(auth.users.raw_user_meta_data ->> 'role', public.profiles.role, 'patient')
FROM auth.users
WHERE auth.users.id = public.profiles.id;

CREATE TABLE IF NOT EXISTS public.professional_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  profession_type TEXT NOT NULL CHECK (profession_type IN ('psychiatrist', 'psychologist')),
  city TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (consultation_fee >= 0),
  payment_link TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_status TEXT NOT NULL DEFAULT 'not_submitted'
    CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected')),
  qualifications TEXT,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'not_submitted';
ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS qualifications TEXT;
ALTER TABLE public.professional_profiles ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.professional_profiles DROP CONSTRAINT IF EXISTS professional_profiles_verification_status_check;
ALTER TABLE public.professional_profiles
  ADD CONSTRAINT professional_profiles_verification_status_check
  CHECK (verification_status IN ('not_submitted', 'pending', 'approved', 'rejected'));

CREATE TABLE IF NOT EXISTS public.professional_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mode TEXT NOT NULL DEFAULT 'online' CHECK (mode IN ('online', 'offline')),
  focus TEXT NOT NULL DEFAULT 'Consultation',
  meeting_url TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'booked', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.professional_sessions(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'manual_pending', 'paid', 'failed', 'refunded')),
  payment_provider TEXT,
  payment_order_id TEXT,
  payment_id TEXT,
  payment_reference TEXT,
  price_paid NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_paid >= 0),
  patient_attended_at TIMESTAMP WITH TIME ZONE,
  professional_attended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_session
  ON public.bookings (session_id)
  WHERE status IN ('pending_payment', 'confirmed');

CREATE TABLE IF NOT EXISTS public.professional_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL DEFAULT '',
  professional_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'post' CHECK (post_type IN ('post', 'short')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professional_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professional_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_verification_documents ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-documents', 'professional-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "professional_profiles_select_public" ON public.professional_profiles;
DROP POLICY IF EXISTS "professional_profiles_insert_own" ON public.professional_profiles;
DROP POLICY IF EXISTS "professional_profiles_update_own" ON public.professional_profiles;
DROP POLICY IF EXISTS "professional_profiles_delete_own" ON public.professional_profiles;
DROP POLICY IF EXISTS "professional_profiles_update_admin" ON public.professional_profiles;
DROP POLICY IF EXISTS "professional_sessions_select_public" ON public.professional_sessions;
DROP POLICY IF EXISTS "professional_sessions_insert_own" ON public.professional_sessions;
DROP POLICY IF EXISTS "professional_sessions_update_own" ON public.professional_sessions;
DROP POLICY IF EXISTS "professional_sessions_delete_own" ON public.professional_sessions;
DROP POLICY IF EXISTS "bookings_select_participants" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_patient" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_participants" ON public.bookings;
DROP POLICY IF EXISTS "professional_reviews_select_public" ON public.professional_reviews;
DROP POLICY IF EXISTS "professional_reviews_insert_patient" ON public.professional_reviews;
DROP POLICY IF EXISTS "professional_reviews_update_participants" ON public.professional_reviews;
DROP POLICY IF EXISTS "community_posts_select_public" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_insert_professional" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_update_own" ON public.community_posts;
DROP POLICY IF EXISTS "community_posts_delete_own" ON public.community_posts;
DROP POLICY IF EXISTS "professional_verification_documents_select_participants" ON public.professional_verification_documents;
DROP POLICY IF EXISTS "professional_verification_documents_insert_own" ON public.professional_verification_documents;
DROP POLICY IF EXISTS "professional_verification_documents_update_admin" ON public.professional_verification_documents;
DROP POLICY IF EXISTS "storage_professional_documents_select_own_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "storage_professional_documents_insert_own" ON storage.objects;

CREATE POLICY "professional_profiles_update_admin"
  ON public.professional_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "professional_profiles_select_public"
  ON public.professional_profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "professional_profiles_insert_own"
  ON public.professional_profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('psychiatrist', 'psychologist')
    )
  );

CREATE POLICY "professional_profiles_update_own"
  ON public.professional_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "professional_profiles_delete_own"
  ON public.professional_profiles FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "professional_sessions_select_public"
  ON public.professional_sessions FOR SELECT
  USING (TRUE);

CREATE POLICY "professional_sessions_insert_own"
  ON public.professional_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
      AND professional_profiles.is_verified = TRUE
      AND professional_profiles.verification_status = 'approved'
    )
  );

CREATE POLICY "professional_sessions_update_own"
  ON public.professional_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "professional_sessions_delete_own"
  ON public.professional_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_select_participants"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_patient"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "bookings_update_participants"
  ON public.bookings FOR UPDATE
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "professional_reviews_select_public"
  ON public.professional_reviews FOR SELECT
  USING (TRUE);

CREATE POLICY "professional_reviews_insert_patient"
  ON public.professional_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = patient_id
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_id
      AND bookings.patient_id = auth.uid()
      AND bookings.status IN ('confirmed', 'completed')
      AND bookings.payment_status = 'paid'
    )
  );

CREATE POLICY "professional_reviews_update_participants"
  ON public.professional_reviews FOR UPDATE
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "community_posts_select_public"
  ON public.community_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "community_posts_insert_professional"
  ON public.community_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.professional_profiles
      WHERE professional_profiles.id = professional_id
      AND professional_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "community_posts_update_own"
  ON public.community_posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "community_posts_delete_own"
  ON public.community_posts FOR DELETE
  USING (auth.uid() = author_id);

CREATE POLICY "professional_verification_documents_select_participants"
  ON public.professional_verification_documents FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "professional_verification_documents_insert_own"
  ON public.professional_verification_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "professional_verification_documents_update_admin"
  ON public.professional_verification_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "storage_professional_documents_select_own_or_admin"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'professional-documents'
    AND (
      owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
  );

CREATE POLICY "storage_professional_documents_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'professional-documents'
    AND owner = auth.uid()
  );
