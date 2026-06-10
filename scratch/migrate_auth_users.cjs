require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const inputPath = process.argv[2] || path.join(__dirname, 'auth_users.json');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Missing input file: ${inputPath}`);
  console.error('Copy scratch/auth_users.example.json to scratch/auth_users.json and fill real staff IDs/emails.');
  process.exit(1);
}

const users = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function assertUser(row, index) {
  if (!row.staff_id || !row.email) {
    throw new Error(`Row ${index + 1} must include staff_id and email.`);
  }
  if (!String(row.email).includes('@')) {
    throw new Error(`Row ${index + 1} has invalid email: ${row.email}`);
  }
  if (!row.password && row.use_legacy_password !== true) {
    throw new Error(`Row ${index + 1} must include password or use_legacy_password: true.`);
  }
}

async function resolvePassword(row) {
  if (row.password) return String(row.password);

  const { data, error } = await supabase
    .from('staff')
    .select('password')
    .eq('id', row.staff_id)
    .single();

  if (error) throw error;
  if (!data?.password) {
    throw new Error(`Staff ${row.staff_id} has no legacy password to migrate.`);
  }

  return String(data.password);
}

(async () => {
  for (let i = 0; i < users.length; i += 1) {
    const row = users[i];
    assertUser(row, i);

    const email = String(row.email).trim().toLowerCase();
    const password = await resolvePassword(row);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (createError && !String(createError.message || '').toLowerCase().includes('already')) {
      throw createError;
    }

    let authUserId = created?.user?.id;
    if (!authUserId) {
      const { data: listed, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) throw listError;
      authUserId = listed.users.find(user => user.email?.toLowerCase() === email)?.id;
    }

    if (!authUserId) {
      throw new Error(`Could not resolve auth user for ${email}`);
    }

    const { error: updateError } = await supabase
      .from('staff')
      .update({ email, auth_user_id: authUserId })
      .eq('id', row.staff_id);

    if (updateError) throw updateError;

    console.log(`Linked ${email} -> staff ${row.staff_id}`);
  }

  console.log('Auth migration complete.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
