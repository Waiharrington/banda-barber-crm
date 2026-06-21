const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const tables = [
    'appointments',
    'appointment_staff',
    'appointment_extras',
    'appointment_products',
    'transactions',
    'inventory',
    'inventory_movements'
  ];

  for (const table of tables) {
    console.log(`\n--- Inspecting ${table} ---`);
    // Try to select 1 row to see if it works and what columns it returns
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error selecting from ${table}:`, error.message);
    } else {
      console.log(`Select succeeded! Active columns:`, data.length > 0 ? Object.keys(data[0]) : 'No rows returned, but table exists');
      
      // Let's do an insert with an invalid column to force PostgREST to output columns if there's no data
      const { error: insertError } = await supabase.from(table).insert([{ NON_EXISTENT_COLUMN_XYZ: 'test' }]);
      console.log(`Insert dummy error message:`, insertError?.message);
    }
  }
}

inspect().catch(console.error);
