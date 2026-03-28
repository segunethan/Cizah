import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = 'hello@cizah.com';
const FROM_NAME = 'Cizah';
const APP_URL = Deno.env.get('APP_URL') || 'https://cizah.com';

// ─── Email Templates ────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cizah</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrapper { max-width:580px; margin:40px auto; }
    .header { background:#0f1117; border-radius:12px 12px 0 0; padding:28px 36px; display:flex; align-items:center; gap:12px; }
    .logo-mark { width:36px; height:36px; background:#d4a843; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; }
    .logo-text { color:#fff; font-size:20px; font-weight:700; letter-spacing:-0.5px; }
    .body { background:#ffffff; padding:40px 36px; }
    .footer { background:#f4f4f0; border-radius:0 0 12px 12px; padding:20px 36px; text-align:center; color:#888; font-size:12px; }
    h1 { margin:0 0 8px; font-size:24px; font-weight:700; color:#0f1117; letter-spacing:-0.5px; }
    p { margin:12px 0; font-size:15px; line-height:1.6; color:#444; }
    .btn { display:inline-block; margin:24px 0; padding:14px 32px; background:#d4a843; color:#0f1117; font-size:15px; font-weight:700; border-radius:8px; text-decoration:none; letter-spacing:0.2px; }
    .pill { display:inline-block; padding:4px 10px; border-radius:20px; font-size:13px; font-weight:600; }
    .pill-green { background:#e8f5e9; color:#2e7d32; }
    .pill-red { background:#fce4e4; color:#c62828; }
    .pill-amber { background:#fff8e1; color:#e65100; }
    .divider { border:none; border-top:1px solid #f0f0f0; margin:24px 0; }
    .amount { font-size:32px; font-weight:800; color:#0f1117; letter-spacing:-1px; }
    .breakdown { background:#f9f9f7; border-radius:8px; padding:16px 20px; margin:16px 0; }
    .breakdown-row { display:flex; justify-content:space-between; padding:6px 0; font-size:14px; color:#555; border-bottom:1px solid #eee; }
    .breakdown-row:last-child { border-bottom:none; font-weight:700; color:#0f1117; }
    .note { font-size:13px; color:#888; line-height:1.5; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo-mark"><span style="color:#0f1117;font-weight:900;font-size:16px">₦</span></div>
    <span class="logo-text">Cizah</span>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} Cizah. All rights reserved.</p>
    <p>Lagos State Tax Management Platform</p>
  </div>
</div>
</body>
</html>`;
}

function verificationEmail(name: string, verificationUrl: string): string {
  return baseLayout(`
    <h1>Verify your email</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thanks for signing up for Cizah. Click the button below to verify your email address and get started.</p>
    <a href="${verificationUrl}" class="btn">Verify Email Address</a>
    <hr class="divider"/>
    <p class="note">This link expires in 24 hours. If you didn't create a Cizah account, you can safely ignore this email.</p>
  `);
}

function passwordResetEmail(name: string, resetUrl: string): string {
  return baseLayout(`
    <h1>Reset your password</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We received a request to reset your Cizah password. Click below to choose a new password.</p>
    <a href="${resetUrl}" class="btn">Reset Password</a>
    <hr class="divider"/>
    <p class="note">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your account is secure.</p>
  `);
}

function adminInviteEmail(name: string, inviteUrl: string, invitedBy: string, role: string): string {
  const roleLabel = role === 'super_admin' ? 'Super Admin' : 'Admin';
  return baseLayout(`
    <h1>You're invited to Cizah Admin</h1>
    <p>Hi ${name},</p>
    <p><strong>${invitedBy}</strong> has invited you to join the Cizah Tax Admin portal as <strong>${roleLabel}</strong>.</p>
    <p>Click the button below to set up your account and get started:</p>
    <a href="${inviteUrl}" class="btn">Accept Invitation</a>
    <hr class="divider"/>
    <p class="note">This invitation expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>
  `);
}

function taxFilingConfirmationEmail(
  name: string,
  period: string,
  taxPayable: number,
  breakdown: Record<string, number>
): string {
  const fmt = (n: number) => '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 });
  return baseLayout(`
    <h1>Tax filing submitted</h1>
    <p>Hi ${name},</p>
    <p>Your tax return for <strong>${period}</strong> has been submitted successfully and is pending review.</p>
    <div class="breakdown">
      <div class="breakdown-row"><span>Total Inflow</span><span>${fmt(breakdown.totalInflow ?? 0)}</span></div>
      <div class="breakdown-row"><span>Total Outflow</span><span>${fmt(breakdown.totalOutflow ?? 0)}</span></div>
      <div class="breakdown-row"><span>Assessable Income</span><span>${fmt(breakdown.assessableIncome ?? 0)}</span></div>
      <div class="breakdown-row"><span>Total Reliefs</span><span>${fmt(breakdown.totalReliefs ?? 0)}</span></div>
      <div class="breakdown-row"><span>Chargeable Income</span><span>${fmt(breakdown.chargeableIncome ?? 0)}</span></div>
      <div class="breakdown-row"><span>Tax Payable</span><span>${fmt(taxPayable)}</span></div>
    </div>
    <p>You'll receive another email once your submission is reviewed. You can also track the status in your <a href="${APP_URL}/reports">Cizah dashboard</a>.</p>
    <hr class="divider"/>
    <p class="note">Keep this email for your records. Your tax record number is visible in your profile.</p>
  `);
}

function taxStatusUpdateEmail(
  name: string,
  period: string,
  status: 'approved' | 'rejected' | 'paid' | 'revisit',
  reason?: string,
  paymentRef?: string
): string {
  const statusMap = {
    approved: { label: 'Approved', pillClass: 'pill-green', message: 'Your tax filing has been reviewed and <strong>approved</strong>. Please proceed to make payment using the bank details in your dashboard.' },
    rejected: { label: 'Rejected', pillClass: 'pill-red', message: `Your tax filing has been <strong>rejected</strong>.${reason ? ` Reason: <em>${reason}</em>` : ''} Please review the feedback and resubmit with the correct information.` },
    paid: { label: 'Payment Confirmed', pillClass: 'pill-green', message: `Your tax payment has been confirmed.${paymentRef ? ` Payment reference: <strong>${paymentRef}</strong>.` : ''} Your records are now up to date.` },
    revisit: { label: 'Needs Revisit', pillClass: 'pill-amber', message: 'Your tax filing requires some changes. Please log in to your dashboard to review the feedback and make the necessary corrections.' },
  };
  const s = statusMap[status];
  return baseLayout(`
    <h1>Tax filing update</h1>
    <p>Hi ${name},</p>
    <p>Your tax return for <strong>${period}</strong> has been updated:</p>
    <p><span class="pill ${s.pillClass}">${s.label}</span></p>
    <p>${s.message}</p>
    <a href="${APP_URL}/reports" class="btn">View in Dashboard</a>
    <hr class="divider"/>
    <p class="note">If you have questions, please contact your tax officer through the dashboard.</p>
  `);
}

// ─── Send via Resend ─────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error ${res.status}: ${err}`);
  }

  return await res.json();
}

// ─── Main Handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, to, name } = body;

    if (!type || !to) {
      return new Response(JSON.stringify({ error: 'Missing type or to' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let subject = '';
    let html = '';

    switch (type) {
      case 'verification': {
        subject = 'Verify your Cizah email';
        html = verificationEmail(name, body.verificationUrl);
        break;
      }
      case 'password_reset': {
        subject = 'Reset your Cizah password';
        html = passwordResetEmail(name, body.resetUrl);
        break;
      }
      case 'tax_filing_confirmation': {
        subject = `Tax return submitted — ${body.period}`;
        html = taxFilingConfirmationEmail(name, body.period, body.taxPayable, body.breakdown || {});
        break;
      }
      case 'admin_invite': {
        subject = `You're invited to join Cizah Admin`;
        html = adminInviteEmail(name, body.inviteUrl, body.invitedBy || 'Admin', body.role || 'admin');
        break;
      }
      case 'tax_status_update': {
        const statusLabels: Record<string, string> = {
          approved: 'approved',
          rejected: 'rejected',
          paid: 'payment confirmed',
          revisit: 'needs revisit',
        };
        subject = `Your tax filing has been ${statusLabels[body.status] ?? 'updated'} — ${body.period}`;
        html = taxStatusUpdateEmail(name, body.period, body.status, body.reason, body.paymentRef);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const result = await sendEmail(to, subject, html);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
