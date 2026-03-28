# Cizah — Setup Guide

A full Nigerian PAYE tax filing application with Supabase + Resend email.

---

## 1. Supabase Setup

### 1a. Run the schema

In your new Supabase project, go to **SQL Editor** and run the file:

```
supabase/migrations/001_cizah_schema.sql
```

This creates all tables, RLS policies, storage buckets, and triggers.

### 1b. Configure Auth email templates (optional but recommended)

Go to **Authentication → Email Templates** in Supabase and disable the default
confirmation/reset emails — Cizah sends its own branded emails via Resend instead.

To do this: go to **Authentication → Providers → Email** and turn off
"Confirm email" if you want Resend to handle it entirely, OR keep it on and
Resend sends a second branded copy.

### 1c. Get your credentials

From **Project Settings → API**:
- `Project URL` → your `VITE_SUPABASE_URL`
- `anon public` key → your `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGci...
```

---

## 3. Supabase Edge Functions Setup

### 3a. Deploy the functions

Install the Supabase CLI, then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy send-email
supabase functions deploy admin-api
supabase functions deploy parse-statement
```

### 3b. Set edge function secrets

```bash
# Your Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx

# Your app URL (used in email links)
supabase secrets set APP_URL=https://cizah.com

# Secret for signing admin JWT sessions (generate a strong random string)
supabase secrets set ADMIN_JWT_SECRET=your-very-long-random-secret-here

# Google Gemini key (used by parse-statement for AI bank statement parsing)
supabase secrets set GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 4. Resend Setup

1. Go to [resend.com](https://resend.com) and create an account
2. Add and verify your domain `cizah.com`
3. Add DNS records as prompted (SPF, DKIM, DMARC)
4. Create an API key with **Sending access**
5. Use that key as `RESEND_API_KEY` above

**From address:** `hello@cizah.com`

**Emails sent by Cizah:**
| Trigger | Subject |
|---|---|
| User signs up | `Verify your Cizah email` |
| User requests password reset | `Reset your Cizah password` |
| User submits tax filing | `Tax return submitted — {period}` |
| Admin approves/rejects/confirms payment | `Your tax filing has been {status}` |

---

## 5. Create the first Admin User

Run this in the Supabase SQL Editor to create an admin account:

```sql
-- Replace with your desired username, name, and a bcrypt hash of your password
-- You can generate a bcrypt hash at: https://bcrypt-generator.com (cost factor 10)

INSERT INTO public.admin_users (username, name, password_hash)
VALUES (
  'admin',
  'Tax Officer',
  '$2a$10$YOUR_BCRYPT_HASH_HERE'
);
```

Then log in at `/admin` with that username and password.

---

## 6. Run Locally

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

| Route | Purpose |
|---|---|
| `/` | User landing page |
| `/auth` | Sign up / login / onboarding |
| `/dashboard` | User tax dashboard |
| `/records` | Financial records |
| `/reports` | Monthly & annual reports + PDF export |
| `/profile` | User profile & photo |
| `/settings` | Tax relief preferences |
| `/admin` | Admin login portal |
| `/admin/dashboard` | Admin overview & activity feed |
| `/admin/users` | All registered users |
| `/admin/users/:id` | Individual user detail & tax management |

---

## 7. Routing Summary

```
/               →  User landing page (public)
/auth           →  Auth & onboarding (public, ?view=login or ?view=signup)
/dashboard      →  Protected user app
/admin          →  Admin landing & login (public, separate from user auth)
/admin/*        →  Protected admin portal (session-based, not Supabase Auth)
```

---

## 8. Email Architecture

Emails flow through:

```
User/Admin action
  → Frontend calls supabase.functions.invoke('send-email', { ... })
    → Edge function formats HTML template
      → Resend API sends from hello@cizah.com
        → User's inbox
```

All email failures are **non-blocking** — the app works even if email sending fails.

---

## 9. Tax Calculation Logic

Nigerian PAYE implemented in `src/lib/taxCalculations.ts` and `src/types/onyx.ts`:

```
Net Inflow        = Total Inflow − Total Outflow
Assessable Income = Net Inflow + Voluntary Gifts − Other Expenses
Chargeable Income = Assessable Income − Total Reliefs
Tax Payable       = PAYE bands applied after ₦800k annual / ₦66.7k monthly exemption
```

Tax bands (`src/types/onyx.ts`):
| Band (Annual) | Rate |
|---|---|
| ₦0 – ₦2.2M | 15% |
| ₦2.2M – ₦9M | 18% |
| ₦9M – ₦13M | 21% |
| ₦13M – ₦25M | 23% |
| ₦25M+ | 25% |

---

## 10. Storage Buckets

| Bucket | Purpose | Access |
|---|---|---|
| `statements` | Bank statement uploads (temp, deleted after parsing) | User-scoped |
| `evidence` | Supporting documents for tax records | User-scoped |
| `passports` | Passport / profile photos | User-scoped |

All buckets are **private** — files are only accessible by the owning user via RLS.
