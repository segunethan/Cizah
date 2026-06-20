-- Allow admins to attach the official remittance receipt/payment advice
-- (uploaded after filing on the Taxportal) so the taxpayer can view/download it.

ALTER TABLE public.tax_calculations ADD COLUMN IF NOT EXISTS receipt_path TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('tax-receipts', 'tax-receipts', false) ON CONFLICT (id) DO NOTHING;

-- Receipts are uploaded server-side by the admin-api edge function (service role,
-- bypasses RLS). Users only need read access to their own folder to download.
CREATE POLICY "Users read own tax receipts" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tax-receipts' AND (storage.foldername(name))[1] = auth.uid()::text);
