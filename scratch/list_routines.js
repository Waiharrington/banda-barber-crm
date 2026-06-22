import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const { data, error } = await supabase
    .from('pg_proc')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error("Error with pg_proc:", error.message);
  } else {
    console.log("pg_proc works! Data:", data);
    return;
  }

  // Try information_schema.routines
  const { data: data2, error: error2 } = await supabase
    .from('routines')
    .select('routine_name')
    .eq('routine_schema', 'public');
  
  if (error2) {
    console.error("Error with routines:", error2.message);
  } else {
    console.log("Routines in public schema:", data2.map(r => r.routine_name));
  }
}

main();
