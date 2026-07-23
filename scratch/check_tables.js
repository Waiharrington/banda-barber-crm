import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'pandabarber' }
});

async function check() {
  const tables = ['clients', 'staff', 'services', 'turn_queue', 'coupons', 'attendance_log'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`❌ Table '${table}' check error:`, error.message);
    } else {
      console.log(`✅ Table '${table}' exists! Columns:`, data.length > 0 ? Object.keys(data[0]) : 'Empty');
    }
  }
}

check().catch(console.error);
