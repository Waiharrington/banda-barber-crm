import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

// Use service role for admin operations (bypasses RLS)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function applyRLSPolicies() {
  console.log("Applying RLS policies to pandabarber schema...\n");

  const statements = [
    // 1. Enable RLS on staff (in case it's off, this is safe to run)
    `ALTER TABLE pandabarber.staff ENABLE ROW LEVEL SECURITY`,

    // 2. Drop any existing conflicting select policy
    `DROP POLICY IF EXISTS "Authenticated users can read staff" ON pandabarber.staff`,
    `DROP POLICY IF EXISTS "Allow authenticated read staff" ON pandabarber.staff`,
    `DROP POLICY IF EXISTS "staff_select_policy" ON pandabarber.staff`,

    // 3. Create open SELECT policy for authenticated users (all staff can see all staff)
    `CREATE POLICY "authenticated_read_staff" ON pandabarber.staff
     FOR SELECT TO authenticated USING (true)`,

    // 4. Also ensure appointments table is accessible
    `ALTER TABLE pandabarber.appointments ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "authenticated_read_appointments" ON pandabarber.appointments`,
    `CREATE POLICY "authenticated_read_appointments" ON pandabarber.appointments
     FOR SELECT TO authenticated USING (true)`,

    // 5. Services table
    `ALTER TABLE pandabarber.services ENABLE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS "authenticated_read_services" ON pandabarber.services`,
    `CREATE POLICY "authenticated_read_services" ON pandabarber.services
     FOR SELECT TO authenticated USING (true)`,
    // Allow anon to also read services (public booking page)
    `DROP POLICY IF EXISTS "anon_read_services" ON pandabarber.services`,
    `CREATE POLICY "anon_read_services" ON pandabarber.services
     FOR SELECT TO anon USING (active = true)`,
  ];

  for (const sql of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        // Try via REST
        console.log(`  ⚠️  RPC failed, trying raw: ${sql.substring(0, 60)}...`);
        console.log(`     Error: ${error.message}`);
      } else {
        console.log(`  ✅ OK: ${sql.substring(0, 70)}...`);
      }
    } catch (e) {
      console.log(`  ⚠️  Exception: ${e.message}`);
    }
  }

  // Alternative: try using pg REST endpoint
  console.log("\nTrying direct SQL via supabase rest...");
  const resp = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': env.VITE_SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({ sql: statements.join(';\n') })
  });
  const text = await resp.text();
  console.log("Response:", resp.status, text.substring(0, 200));
}

applyRLSPolicies();
