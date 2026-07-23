const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'pandabarber' }
});

async function main() {
  const sql = "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'pandabarber' AND table_name = 'attendance_log';";
  
  const rpcNames = ['exec_sql', 'run_sql', 'execute_sql', 'sql'];
  for (const name of rpcNames) {
    try {
      console.log(`Trying RPC in pandabarber schema: ${name}...`);
      const { data, error } = await supabase.rpc(name, { query: sql, sql: sql });
      if (!error) {
        console.log(`Success with RPC ${name}! Columns:`, data);
        return;
      }
      console.log(`RPC ${name} returned error:`, error.message);
    } catch (e) {
      console.log(`RPC ${name} threw:`, e.message);
    }
  }
}

main().catch(console.error);
