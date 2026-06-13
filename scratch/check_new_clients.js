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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Try inserting with ONLY name and phone
  const testClient1 = {
    name: 'Test Name Only'
  };
  const { data: insData, error: insErr } = await supabase.from('clients').insert([testClient1]).select();
  if (insErr) {
    console.error("Insert name only error:", insErr);
  } else {
    console.log("Successfully inserted name only! Record keys:", Object.keys(insData[0]), insData[0]);
    // Clean up
    await supabase.from('clients').delete().eq('id', insData[0].id);
  }
}

check().catch(console.error);
