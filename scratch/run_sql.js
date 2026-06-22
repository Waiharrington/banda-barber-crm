import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const sql = 'ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS biography text;';
  
  // Try common SQL execution RPC names
  const rpcNames = ['exec_sql', 'run_sql', 'execute_sql', 'sql'];
  for (const name of rpcNames) {
    try {
      console.log(`Trying RPC: ${name}...`);
      const { data, error } = await supabase.rpc(name, { query: sql, sql: sql });
      if (!error) {
        console.log(`Success with RPC ${name}!`, data);
        return;
      }
      console.log(`RPC ${name} returned error:`, error.message);
    } catch (e) {
      console.log(`RPC ${name} threw:`, e.message);
    }
  }
  
  console.log("Could not run DDL via RPC. Let's check table fields to be absolutely sure.");
}

main();
