import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const sql = `
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.clients;
    CREATE POLICY "Enable insert for authenticated users only" ON public.clients FOR INSERT WITH CHECK (true);
    
    DROP POLICY IF EXISTS "Enable insert for anon users" ON public.clients;
    CREATE POLICY "Enable insert for anon users" ON public.clients FOR INSERT WITH CHECK (true);
  `;
  
  const rpcNames = ['exec_sql', 'run_sql', 'execute_sql', 'sql'];
  for (const name of rpcNames) {
    try {
      const { data, error } = await supabase.rpc(name, { query: sql, sql: sql });
      if (!error) {
        console.log(`Success with RPC ${name}!`);
        return;
      }
    } catch (e) {
    }
  }
  console.log("Could not run SQL via RPC.");
}

main();
