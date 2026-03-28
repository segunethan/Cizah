CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -------------------------------------------------------
-- ADMIN PROFILES (replaces admin_users + admin_sessions)
-- -------------------------------------------------------
CREATE TABLE public.admin_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  invited_by    UUID REFERENCES public.admin_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can read their own profile (used by client-side auth check)
CREATE POLICY "Admins read own profile" ON public.admin_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- ADMIN INVITATIONS
-- -------------------------------------------------------
CREATE TABLE public.admin_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  name         TEXT,
  role         TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
  invited_by   UUID REFERENCES public.admin_profiles(id),
  token        TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No public RLS — accessed only via service role in edge functions
