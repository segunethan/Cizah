import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ALLOWED_ORIGINS = [
  'https://cizah.com',
  'https://www.cizah.com',
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const APP_URL = Deno.env.get('APP_URL') || 'https://cizah.com';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
  const ok = (data: unknown) => new Response(JSON.stringify(data), { headers: jsonHeaders });
  const fail = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Service role client — bypasses RLS for all data operations
    const adminDb = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { action } = body;

    // ── PUBLIC: accept_invite (no auth required) ──────────────────────
    if (action === 'accept_invite') {
      const { token, password, name } = body;
      if (!token || !password) return fail('token and password are required');
      if (password.length < 8) return fail('Password must be at least 8 characters');

      const { data: invite, error: inviteErr } = await adminDb
        .from('admin_invitations')
        .select('*')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteErr || !invite) return fail('Invalid or expired invitation link');

      const { data: { user }, error: createErr } = await adminDb.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { name: name || invite.name || '' },
      });

      if (createErr) return fail(createErr.message);

      await adminDb.from('admin_profiles').insert({
        id: user!.id,
        name: name || invite.name || invite.email,
        role: invite.role,
        invited_by: invite.invited_by,
      });

      await adminDb
        .from('admin_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id);

      console.log(`Invite accepted: ${invite.email} → ${invite.role}`);
      return ok({ success: true, email: invite.email });
    }

    // ── AUTHENTICATED ACTIONS — require Supabase JWT ──────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return fail('Unauthorized', 401);

    const jwt = authHeader.substring(7);
    const { data: { user }, error: userErr } = await adminDb.auth.getUser(jwt);
    if (userErr || !user) return fail('Unauthorized', 401);

    // Verify admin profile
    const { data: adminProfile, error: profileErr } = await adminDb
      .from('admin_profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .single();

    if (profileErr || !adminProfile) return fail('Access denied. Not an admin user.', 403);

    const isSuperAdmin = adminProfile.role === 'super_admin';

    // ── verify_admin ──────────────────────────────────────────────────
    if (action === 'verify_admin') {
      return ok({ admin: adminProfile });
    }

    // ── invite_admin (super_admin only) ───────────────────────────────
    if (action === 'invite_admin') {
      if (!isSuperAdmin) return fail('Only super admins can invite users', 403);

      const { email, name: inviteeName, role = 'admin' } = body;
      if (!email) return fail('Email is required');
      if (!['super_admin', 'admin'].includes(role)) return fail('Invalid role');

      // Check for active invitation
      const { data: existing } = await adminDb
        .from('admin_invitations')
        .select('id')
        .eq('email', email.toLowerCase())
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existing) return fail('An active invitation already exists for this email');

      const { data: invitation, error: insertErr } = await adminDb
        .from('admin_invitations')
        .insert({ email: email.toLowerCase(), name: inviteeName, role, invited_by: adminProfile.id })
        .select()
        .single();

      if (insertErr) throw insertErr;

      await adminDb.functions.invoke('send-email', {
        body: {
          type: 'admin_invite',
          to: email,
          name: inviteeName || email,
          inviteUrl: `${APP_URL}/admin/accept-invite?token=${invitation.token}`,
          invitedBy: adminProfile.name || 'Admin',
          role,
        },
      });

      console.log(`Invite sent to ${email} by ${adminProfile.id}`);
      return ok({ success: true });
    }

    // ── get_admins (super_admin only) ─────────────────────────────────
    if (action === 'get_admins') {
      if (!isSuperAdmin) return fail('Only super admins can view admin list', 403);

      const { data: admins, error } = await adminDb
        .from('admin_profiles')
        .select('id, name, role, created_at')
        .order('created_at');

      if (error) throw error;
      return ok({ admins: admins || [] });
    }

    // ── get_invitations (super_admin only) ────────────────────────────
    if (action === 'get_invitations') {
      if (!isSuperAdmin) return fail('Only super admins can view invitations', 403);

      const { data: invitations, error } = await adminDb
        .from('admin_invitations')
        .select('id, email, name, role, accepted_at, expires_at, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return ok({ invitations: invitations || [] });
    }

    // ── Data actions ──────────────────────────────────────────────────
    switch (action) {
      case 'get_metrics': {
        const { count: userCount } = await adminDb
          .from('user_profiles')
          .select('*', { count: 'exact', head: true });

        const { data: records, count: recordCount } = await adminDb
          .from('financial_records')
          .select('type, amount', { count: 'exact' });

        let totalInflow = 0;
        let totalOutflow = 0;
        if (records) {
          records.forEach((r: any) => {
            if (r.type === 'inflow') totalInflow += Number(r.amount);
            else if (r.type === 'outflow') totalOutflow += Number(r.amount);
          });
        }

        const { data: taxCalcs } = await adminDb
          .from('tax_calculations')
          .select('status, tax_payable');

        let totalTaxPayable = 0;
        let pendingApprovals = 0;
        let approvedCalculations = 0;
        let rejectedCalculations = 0;

        if (taxCalcs) {
          taxCalcs.forEach((c: any) => {
            totalTaxPayable += Number(c.tax_payable);
            if (c.status === 'pending') pendingApprovals++;
            if (['approved', 'paid', 'filed'].includes(c.status)) approvedCalculations++;
            if (c.status === 'rejected') rejectedCalculations++;
          });
        }

        return ok({
          totalUsers: userCount || 0,
          totalRecords: recordCount || 0,
          totalInflow,
          totalOutflow,
          totalTaxPayable,
          pendingApprovals,
          approvedCalculations,
          rejectedCalculations,
        });
      }

      case 'get_users': {
        const { data: users, error } = await adminDb
          .from('user_profiles')
          .select('id, name, email, phone, tax_record_number, created_at, onboarding_completed')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return ok({ users: users || [] });
      }

      case 'get_user_details': {
        const { userId } = body;
        if (!userId) return fail('User ID required');
        const { data: profile, error } = await adminDb
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return ok({ profile });
      }

      case 'get_user_records': {
        const { userId } = body;
        if (!userId) return fail('User ID required');
        const { data: records, error } = await adminDb
          .from('financial_records')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false });
        if (error) throw error;
        return ok({ records: records || [] });
      }

      case 'get_user_tax_calculations': {
        const { userId } = body;
        if (!userId) return fail('User ID required');
        const { data: calculations, error } = await adminDb
          .from('tax_calculations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return ok({ calculations: calculations || [] });
      }

      case 'confirm_payment': {
        const { calculationId } = body;
        if (!calculationId) return fail('Calculation ID required');

        const { data: calc, error: calcErr } = await adminDb
          .from('tax_calculations')
          .select('id, status, user_id')
          .eq('id', calculationId)
          .single();

        if (calcErr || !calc) return fail('Tax calculation not found', 404);
        if (calc.status !== 'paid')
          return fail(`Cannot confirm payment. Current status: ${calc.status}`);

        const { error: updateErr } = await adminDb
          .from('tax_calculations')
          .update({
            status: 'filed',
            filed_at: new Date().toISOString(),
            filed_by: adminProfile.id,
          })
          .eq('id', calculationId);
        if (updateErr) throw updateErr;

        try {
          const { data: up } = await adminDb
            .from('user_profiles')
            .select('name, email')
            .eq('id', calc.user_id)
            .single();
          if (up?.email) {
            await adminDb.functions.invoke('send-email', {
              body: { type: 'tax_status_update', to: up.email, name: up.name, period: 'your recent filing', status: 'paid' },
            });
          }
        } catch (e) { console.warn('Email failed:', e); }

        return ok({ success: true });
      }

      case 'revisit_rejection': {
        const { calculationId } = body;
        if (!calculationId) return fail('Calculation ID required');

        const { data: calc, error: calcErr } = await adminDb
          .from('tax_calculations')
          .select('id, status, user_id')
          .eq('id', calculationId)
          .single();

        if (calcErr || !calc) return fail('Tax calculation not found', 404);
        if (calc.status !== 'rejected')
          return fail(`Cannot revisit. Current status: ${calc.status}`);

        const { error: updateErr } = await adminDb
          .from('tax_calculations')
          .update({ status: 'revisit' })
          .eq('id', calculationId);
        if (updateErr) throw updateErr;

        try {
          const { data: up } = await adminDb
            .from('user_profiles')
            .select('name, email')
            .eq('id', calc.user_id)
            .single();
          if (up?.email) {
            await adminDb.functions.invoke('send-email', {
              body: { type: 'tax_status_update', to: up.email, name: up.name, period: 'your recent filing', status: 'revisit' },
            });
          }
        } catch (e) { console.warn('Email failed:', e); }

        return ok({ success: true });
      }

      case 'get_tax_activity': {
        const { data: activityCalcs, error } = await adminDb
          .from('tax_calculations')
          .select('*')
          .in('status', ['paid', 'rejected', 'approved', 'revisit'])
          .order('updated_at', { ascending: false })
          .limit(50);
        if (error) throw error;

        const userIds = [...new Set((activityCalcs || []).map((c: any) => c.user_id))];
        const userMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await adminDb
            .from('user_profiles')
            .select('id, name, email, tax_record_number')
            .in('id', userIds);
          if (profiles) profiles.forEach((p: any) => { userMap[p.id] = p; });
        }

        const activity = (activityCalcs || []).map((calc: any) => ({
          ...calc,
          user_name: userMap[calc.user_id]?.name || 'Unknown',
          user_email: userMap[calc.user_id]?.email || null,
          user_tax_record: userMap[calc.user_id]?.tax_record_number || null,
        }));

        return ok({ activity });
      }

      default:
        return fail('Unknown action');
    }
  } catch (error: unknown) {
    console.error('Admin API error:', error);
    const origin = req.headers.get('Origin');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
});
