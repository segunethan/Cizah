// Run with: npx tsx scripts/seed-super-admin.ts
// Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gisfihwxixudfdwlbrkm.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'adebayosegun1995@gmail.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Chelsea2025%';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME || 'Adebayosegun';

async function seedSuperAdmin() {
  console.log(`Creating super admin: ${SUPER_ADMIN_EMAIL}`);

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users.find(u => u.email === SUPER_ADMIN_EMAIL);

  let userId: string;

  if (existing) {
    console.log('Auth user already exists, using existing user...');
    userId = existing.id;
    // Update password
    await supabase.auth.admin.updateUserById(userId, { password: SUPER_ADMIN_PASSWORD });
  } else {
    // Create auth user
    const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: SUPER_ADMIN_NAME },
    });

    if (createError) {
      console.error('Failed to create auth user:', createError.message);
      process.exit(1);
    }

    userId = user!.id;
    console.log(`Auth user created: ${userId}`);
  }

  // Upsert admin profile
  const { error: profileError } = await supabase
    .from('admin_profiles')
    .upsert({ id: userId, name: SUPER_ADMIN_NAME, role: 'super_admin' });

  if (profileError) {
    console.error('Failed to create admin profile:', profileError.message);
    process.exit(1);
  }

  console.log('Super admin created successfully!');
  console.log(`   Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`   Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log(`   Role: super_admin`);
  console.log('\nYou can now sign in at /admin');
}

seedSuperAdmin().catch(console.error);
