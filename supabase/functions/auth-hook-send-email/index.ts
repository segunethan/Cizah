/**
 * Supabase Auth Hook: send_email
 *
 * Supabase calls this function instead of sending auth emails itself.
 * Intercepts: signup verification, password recovery, email change, magic link.
 * Sends branded emails via Resend.
 *
 * Configure in: Supabase Dashboard → Authentication → Hooks → Send Email
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const APP_URL = Deno.env.get('APP_URL') || 'https://cizah.com';
const HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
const FROM_EMAIL = 'hello@cizah.com';
const FROM_NAME = 'Cizah';

// ─── Hook authorization ───────────────────────────────────────────────────────
// Supabase sends the hook secret as a Bearer token in the Authorization header.

function isAuthorized(authHeader: string | null, secret: string | undefined): boolean {
  if (!authHeader?.startsWith('Bearer ')) return false;
  if (!secret) return true; // no secret configured — allow (hook URL is internal)
  const token = authHeader.substring(7);
  // Supabase sends the raw secret string as the Bearer token
  return token === secret;
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cizah</title>
  <style>
    body { margin:0; padding:0; background:#f4f4f0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; }
    .wrapper { max-width:580px; margin:40px auto; }
    .header { background:#1a56db; border-radius:12px 12px 0 0; padding:28px 36px; }
    .logo-mark { display:inline-flex; align-items:center; gap:10px; }
    .logo-icon { width:36px; height:36px; background:rgba(255,255,255,0.2); border-radius:8px; display:inline-flex; align-items:center; justify-content:center; }
    .logo-text { color:#fff; font-size:20px; font-weight:700; letter-spacing:-0.5px; }
    .body { background:#ffffff; padding:40px 36px; }
    .footer { background:#f4f4f0; border-radius:0 0 12px 12px; padding:20px 36px; text-align:center; color:#888; font-size:12px; }
    h1 { margin:0 0 8px; font-size:24px; font-weight:700; color:#111827; letter-spacing:-0.5px; }
    p { margin:12px 0; font-size:15px; line-height:1.6; color:#444; }
    .btn { display:inline-block; margin:24px 0; padding:14px 32px; background:#1a56db; color:#ffffff; font-size:15px; font-weight:700; border-radius:8px; text-decoration:none; letter-spacing:0.2px; }
    .divider { border:none; border-top:1px solid #f0f0f0; margin:24px 0; }
    .note { font-size:13px; color:#888; line-height:1.5; }
    .otp-box { background:#f0f4ff; border:2px solid #1a56db; border-radius:10px; padding:20px; text-align:center; margin:20px 0; }
    .otp-code { font-size:36px; font-weight:800; letter-spacing:8px; color:#1a56db; font-family:monospace; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo-mark">
      <div class="logo-icon">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
      </div>
      <span class="logo-text">Cizah</span>
    </div>
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

// ─── Email templates ──────────────────────────────────────────────────────────

function verificationEmail(name: string, actionUrl: string, otp?: string): string {
  return baseLayout(`
    <h1>Verify your email</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Thanks for signing up for Cizah. Please verify your email address to activate your account.</p>
    ${otp ? `
    <p>Enter this code on the verification page:</p>
    <div class="otp-box">
      <div class="otp-code">${otp}</div>
    </div>
    <p style="text-align:center;margin-top:0">or</p>
    ` : ''}
    <p>Click the button below to verify your email and get started:</p>
    <a href="${actionUrl}" class="btn">Verify Email Address</a>
    <hr class="divider"/>
    <p class="note">This link expires in 24 hours. If you didn't create a Cizah account, you can safely ignore this email.</p>
  `);
}

function passwordResetEmail(name: string, actionUrl: string): string {
  return baseLayout(`
    <h1>Reset your password</h1>
    <p>Hi ${name || 'there'},</p>
    <p>We received a request to reset your Cizah password. Click below to choose a new password.</p>
    <a href="${actionUrl}" class="btn">Reset Password</a>
    <hr class="divider"/>
    <p class="note">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your account is secure.</p>
  `);
}

function emailChangeEmail(name: string, actionUrl: string): string {
  return baseLayout(`
    <h1>Confirm your new email</h1>
    <p>Hi ${name || 'there'},</p>
    <p>You requested to change your email address on Cizah. Click below to confirm the new address.</p>
    <a href="${actionUrl}" class="btn">Confirm New Email</a>
    <hr class="divider"/>
    <p class="note">This link expires in 24 hours. If you didn't request this change, please contact support immediately.</p>
  `);
}

function magicLinkEmail(name: string, actionUrl: string): string {
  return baseLayout(`
    <h1>Your sign-in link</h1>
    <p>Hi ${name || 'there'},</p>
    <p>Click below to sign in to Cizah. This link can only be used once.</p>
    <a href="${actionUrl}" class="btn">Sign In to Cizah</a>
    <hr class="divider"/>
    <p class="note">This link expires in 1 hour. If you didn't request this, you can safely ignore it.</p>
  `);
}

// ─── Resend send helper ───────────────────────────────────────────────────────

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
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
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify the request is from Supabase
  const authHeader = req.headers.get('Authorization');
  if (!isAuthorized(authHeader, HOOK_SECRET)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
    user: { email: string; user_metadata?: { name?: string } };
    email_data: {
      token: string;
      token_hash: string;
      redirect_to: string;
      email_action_type: string;
      site_url: string;
    };
  };

  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { user, email_data } = body;
  const { token_hash, email_action_type } = email_data;

  const email = user.email;
  const name = user.user_metadata?.name || email.split('@')[0];

  // Build the redirect URL for after token verification
  // For password recovery, we redirect to the reset form
  // For everything else, we redirect to the main auth page
  const appRedirectTo =
    email_action_type === 'recovery'
      ? `${APP_URL}/auth?reset=true`
      : `${APP_URL}/auth`;

  // Use Supabase's verify endpoint — it validates the token and redirects to our app
  // The Supabase JS client will pick up the session from the URL fragment on landing
  const actionUrl = `${SUPABASE_URL}/auth/v1/verify?token=${encodeURIComponent(token_hash)}&type=${email_action_type}&redirect_to=${encodeURIComponent(appRedirectTo)}`;

  let subject: string;
  let html: string;

  switch (email_action_type) {
    case 'signup':
    case 'email_confirm':
      subject = 'Verify your Cizah email';
      html = verificationEmail(name, actionUrl, email_data.token);
      break;

    case 'recovery':
      subject = 'Reset your Cizah password';
      html = passwordResetEmail(name, actionUrl);
      break;

    case 'invite':
      subject = "You've been invited to Cizah";
      html = verificationEmail(name, actionUrl);
      break;

    case 'magiclink':
      subject = 'Your Cizah sign-in link';
      html = magicLinkEmail(name, actionUrl);
      break;

    case 'email_change':
    case 'email_change_new':
    case 'email_change_current':
      subject = 'Confirm your new Cizah email';
      html = emailChangeEmail(name, actionUrl);
      break;

    default:
      console.warn(`[auth-hook-send-email] Unknown action type: ${email_action_type}`);
      // Return 200 so Supabase doesn't retry — fall back to Supabase's built-in email
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
  }

  try {
    await sendViaResend(email, subject, html);
    console.log(`[auth-hook-send-email] Sent ${email_action_type} email to ${email}`);
  } catch (err) {
    console.error(`[auth-hook-send-email] Failed to send email:`, err);
    // Return 500 so Supabase knows the email wasn't sent
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
