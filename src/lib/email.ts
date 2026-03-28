import { supabase } from '@/integrations/supabase/client';

type EmailType =
  | 'verification'
  | 'password_reset'
  | 'tax_filing_confirmation'
  | 'tax_status_update';

interface BaseEmailPayload {
  type: EmailType;
  to: string;
  name: string;
}

interface VerificationEmailPayload extends BaseEmailPayload {
  type: 'verification';
  verificationUrl: string;
}

interface PasswordResetEmailPayload extends BaseEmailPayload {
  type: 'password_reset';
  resetUrl: string;
}

interface TaxFilingEmailPayload extends BaseEmailPayload {
  type: 'tax_filing_confirmation';
  period: string;
  taxPayable: number;
  breakdown: {
    totalInflow: number;
    totalOutflow: number;
    assessableIncome: number;
    totalReliefs: number;
    chargeableIncome: number;
  };
}

interface TaxStatusEmailPayload extends BaseEmailPayload {
  type: 'tax_status_update';
  period: string;
  status: 'approved' | 'rejected' | 'paid' | 'revisit';
  reason?: string;
  paymentRef?: string;
}

type EmailPayload =
  | VerificationEmailPayload
  | PasswordResetEmailPayload
  | TaxFilingEmailPayload
  | TaxStatusEmailPayload;

/**
 * Send a transactional email via the Cizah send-email edge function (Resend).
 * Errors are swallowed so email failures don't block critical user actions.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: payload,
    });
    if (error) {
      console.error('[sendEmail] Edge function error:', error);
    }
  } catch (err) {
    console.error('[sendEmail] Unexpected error:', err);
  }
}

/**
 * Format a period string like "March 2026 (Monthly)"
 */
export function formatTaxPeriod(
  month: number | undefined,
  year: number,
  periodType: 'monthly' | 'annually'
): string {
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  if (periodType === 'annually') return `${year} (Annual)`;
  return `${months[month ?? 0]} ${year} (Monthly)`;
}
