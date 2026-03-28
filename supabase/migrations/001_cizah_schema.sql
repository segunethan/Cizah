-- ============================================================
-- CIZAH TAX APPLICATION — COMPLETE SCHEMA
-- ============================================================

-- -------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------
-- UTILITY: auto-update updated_at
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- -------------------------------------------------------
-- USER PROFILES
-- -------------------------------------------------------
CREATE TABLE public.user_profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Basic
  name                  TEXT NOT NULL DEFAULT '',
  email                 TEXT,
  phone                 TEXT,
  -- Personal
  surname               TEXT,
  first_name            TEXT,
  other_name            TEXT,
  preferred_name        TEXT,
  prefix                TEXT CHECK (prefix IN ('Mr','Miss','Ms','Mrs','Dr','Pastor','Rev')),
  date_of_birth         DATE,
  gender                TEXT CHECK (gender IN ('Male','Female')),
  -- Address
  house_address         TEXT,
  office_address        TEXT,
  state                 TEXT,
  lga                   TEXT,
  lcda                  TEXT,
  -- Identity & Work
  occupation            TEXT,
  identity_type         TEXT CHECK (identity_type IN ('BVN','NIN')),
  identity_number       TEXT,
  lassra_no             TEXT,
  passport_photo_url    TEXT,
  tax_record_number     TEXT UNIQUE,
  -- Financial & Assets
  num_banks             INTEGER,
  banks_list            TEXT[],
  num_cars              INTEGER,
  num_houses            INTEGER,
  -- Housing
  apartment_style       TEXT CHECK (apartment_style IN ('flat','bungalow','duplex','studio','mini_flat')),
  apartment_type        TEXT CHECK (apartment_type IN ('tenant','owner','mission','gift','family')),
  rent_amount           NUMERIC,
  rent_agreement_url    TEXT,
  rent_receipt_url      TEXT,
  has_mortgage          BOOLEAN DEFAULT FALSE,
  -- Reliefs selected during onboarding
  selected_reliefs      TEXT[] DEFAULT '{}',
  -- Tax preference
  tax_period_preference TEXT NOT NULL DEFAULT 'monthly' CHECK (tax_period_preference IN ('monthly','annually')),
  -- Onboarding
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  bank_accounts_connected BOOLEAN NOT NULL DEFAULT FALSE,
  -- Timestamps
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"    ON public.user_profiles FOR SELECT    TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"  ON public.user_profiles FOR INSERT    TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"  ON public.user_profiles FOR UPDATE    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate TAX record number
CREATE OR REPLACE FUNCTION public.generate_tax_record_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  attempts    INTEGER := 0;
BEGIN
  IF NEW.tax_record_number IS NOT NULL THEN RETURN NEW; END IF;
  LOOP
    attempts := attempts + 1;
    SELECT COALESCE(MAX(CAST(SUBSTRING(tax_record_number FROM 4) AS INTEGER)), 0) + 1
    INTO next_number FROM public.user_profiles WHERE tax_record_number IS NOT NULL;
    NEW.tax_record_number := 'TAX' || LPAD(next_number::TEXT, 6, '0');
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE tax_record_number = NEW.tax_record_number) THEN
      RETURN NEW;
    END IF;
    IF attempts >= 10 THEN
      NEW.tax_record_number := 'TAX' || LPAD((next_number + floor(random() * 1000)::int)::TEXT, 6, '0');
      RETURN NEW;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER generate_tax_record_number_trigger
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.generate_tax_record_number();

-- -------------------------------------------------------
-- CONNECTED BANK ACCOUNTS
-- -------------------------------------------------------
CREATE TABLE public.connected_bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_name      TEXT NOT NULL,
  account_number TEXT,
  account_type   TEXT,
  is_selected    BOOLEAN NOT NULL DEFAULT TRUE,
  connected_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bank accounts"   ON public.connected_bank_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.connected_bank_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.connected_bank_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank accounts" ON public.connected_bank_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_connected_bank_accounts_updated_at
  BEFORE UPDATE ON public.connected_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- FINANCIAL RECORDS
-- -------------------------------------------------------
CREATE TABLE public.financial_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('inflow','outflow','relief')),
  category     TEXT NOT NULL,
  amount       NUMERIC NOT NULL CHECK (amount >= 0),
  description  TEXT,
  date         TIMESTAMP WITH TIME ZONE NOT NULL,
  evidence_url TEXT,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own records"   ON public.financial_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON public.financial_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own records" ON public.financial_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own records" ON public.financial_records FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_financial_records_updated_at
  BEFORE UPDATE ON public.financial_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- TAX CALCULATIONS
-- -------------------------------------------------------
CREATE TABLE public.tax_calculations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_type             TEXT NOT NULL CHECK (period_type IN ('monthly','annually')),
  period_month            INTEGER CHECK (period_month BETWEEN 0 AND 11),
  period_year             INTEGER NOT NULL,
  total_inflow            NUMERIC NOT NULL DEFAULT 0,
  total_outflow           NUMERIC NOT NULL DEFAULT 0,
  net_inflow              NUMERIC NOT NULL DEFAULT 0,
  voluntary_gift          NUMERIC NOT NULL DEFAULT 0,
  other_expenses          NUMERIC NOT NULL DEFAULT 0,
  assessable_income       NUMERIC NOT NULL DEFAULT 0,
  total_reliefs           NUMERIC NOT NULL DEFAULT 0,
  chargeable_income       NUMERIC NOT NULL DEFAULT 0,
  tax_payable             NUMERIC NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid','filed','revisit')),
  rejection_reason        TEXT,
  rejection_evidence_url  TEXT,
  user_rejection_reason   TEXT,
  payment_reference       TEXT,
  payment_date            TIMESTAMP WITH TIME ZONE,
  filed_at                TIMESTAMP WITH TIME ZONE,
  filed_by                TEXT,
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own calculations"   ON public.tax_calculations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calculations" ON public.tax_calculations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calculations" ON public.tax_calculations FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_tax_calculations_updated_at
  BEFORE UPDATE ON public.tax_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- STATEMENT PARSE JOBS
-- -------------------------------------------------------
CREATE TABLE public.statement_parse_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_url    TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  result      JSONB,
  error       TEXT,
  period_month INTEGER,
  period_year  INTEGER,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.statement_parse_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own parse jobs"   ON public.statement_parse_jobs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own parse jobs" ON public.statement_parse_jobs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own parse jobs" ON public.statement_parse_jobs FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_statement_parse_jobs_updated_at
  BEFORE UPDATE ON public.statement_parse_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------------
-- ADMIN USERS
-- -------------------------------------------------------
CREATE TABLE public.admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin sessions
CREATE TABLE public.admin_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  expires_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address   TEXT,
  user_agent   TEXT,
  revoked      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Safe view for admin users (no password hash)
CREATE VIEW public.admin_users_safe AS
  SELECT id, username, name, created_at, updated_at FROM public.admin_users;

-- Admin tables are service-role only — no user-facing RLS needed

-- -------------------------------------------------------
-- STORAGE BUCKETS
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('statements', 'statements', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('passports', 'passports', false) ON CONFLICT (id) DO NOTHING;

-- Statements bucket policies
CREATE POLICY "Users upload to own folder in statements" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own files in statements" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own files in statements" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'statements' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Evidence bucket policies
CREATE POLICY "Users upload to own folder in evidence" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own files in evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own files in evidence" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Passports bucket policies
CREATE POLICY "Users upload own passport" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'passports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users read own passport" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'passports' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own passport" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'passports' AND (storage.foldername(name))[1] = auth.uid()::text);
