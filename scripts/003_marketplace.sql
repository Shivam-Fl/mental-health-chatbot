-- Marketplace extension: roles, sessions, bookings, feedback, and social posts

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.profiles
SET role = 'patient'
WHERE role IS NULL OR role NOT IN ('patient', 'psychiatrist', 'psychologist');

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'patient';

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('patient', 'psychiatrist', 'psychologist'));
  END IF;
END $$;

-- Public read for marketplace discovery (name + role visibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_public_marketplace'
  ) THEN
    CREATE POLICY "profiles_select_public_marketplace"
      ON public.profiles
      FOR SELECT
      USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 15 AND duration_minutes <= 180),
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  mode TEXT NOT NULL CHECK (mode IN ('online', 'offline')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  payment_provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  professional_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'post' CHECK (post_type IN ('post', 'short')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_select_all') THEN
    CREATE POLICY "sessions_select_all" ON public.sessions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_insert_professional') THEN
    CREATE POLICY "sessions_insert_professional"
      ON public.sessions FOR INSERT
      WITH CHECK (
        auth.uid() = professional_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('psychiatrist', 'psychologist')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sessions' AND policyname='sessions_update_own_professional') THEN
    CREATE POLICY "sessions_update_own_professional"
      ON public.sessions FOR UPDATE
      USING (
        auth.uid() = professional_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('psychiatrist', 'psychologist')
        )
      )
      WITH CHECK (
        auth.uid() = professional_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role IN ('psychiatrist', 'psychologist')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_select_participants') THEN
    CREATE POLICY "bookings_select_participants"
      ON public.bookings FOR SELECT
      USING (
        auth.uid() = patient_id OR
        auth.uid() IN (
          SELECT s.professional_id FROM public.sessions s WHERE s.id = session_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_insert_patient') THEN
    CREATE POLICY "bookings_insert_patient"
      ON public.bookings FOR INSERT
      WITH CHECK (
        auth.uid() = patient_id
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.role = 'patient'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='bookings_update_participants') THEN
    CREATE POLICY "bookings_update_participants"
      ON public.bookings FOR UPDATE
      USING (
        auth.uid() = patient_id OR
        auth.uid() IN (
          SELECT s.professional_id FROM public.sessions s WHERE s.id = session_id
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_feedback' AND policyname='session_feedback_select_all') THEN
    CREATE POLICY "session_feedback_select_all" ON public.session_feedback FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_feedback' AND policyname='session_feedback_insert_patient') THEN
    CREATE POLICY "session_feedback_insert_patient"
      ON public.session_feedback FOR INSERT
      WITH CHECK (
        auth.uid() = patient_id
        AND auth.uid() IN (
          SELECT b.patient_id FROM public.bookings b WHERE b.id = booking_id
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='session_feedback' AND policyname='session_feedback_update_professional') THEN
    CREATE POLICY "session_feedback_update_professional"
      ON public.session_feedback FOR UPDATE
      USING (auth.uid() = professional_id OR auth.uid() = patient_id)
      WITH CHECK (auth.uid() = professional_id OR auth.uid() = patient_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_posts' AND policyname='social_posts_select_all') THEN
    CREATE POLICY "social_posts_select_all" ON public.social_posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_posts' AND policyname='social_posts_insert_own') THEN
    CREATE POLICY "social_posts_insert_own" ON public.social_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_posts' AND policyname='social_posts_update_own') THEN
    CREATE POLICY "social_posts_update_own" ON public.social_posts FOR UPDATE USING (auth.uid() = author_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='social_posts' AND policyname='social_posts_delete_own') THEN
    CREATE POLICY "social_posts_delete_own" ON public.social_posts FOR DELETE USING (auth.uid() = author_id);
  END IF;
END $$;
