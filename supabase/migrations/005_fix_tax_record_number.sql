-- Fix duplicate tax_record_number by using a Postgres sequence instead of MAX()+1
-- A sequence is atomic and concurrent-safe — no race conditions possible.

CREATE SEQUENCE IF NOT EXISTS public.tax_record_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Seed the sequence to the current highest number so we don't collide with existing records
SELECT setval(
  'public.tax_record_number_seq',
  COALESCE(
    MAX(CAST(SUBSTRING(tax_record_number FROM 4) AS INTEGER)),
    0
  )
)
FROM public.user_profiles
WHERE tax_record_number ~ '^TAX[0-9]+$';

-- Replace the trigger function with a sequence-based one
CREATE OR REPLACE FUNCTION public.generate_tax_record_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tax_record_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  NEW.tax_record_number := 'TAX' || LPAD(nextval('public.tax_record_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$;
