import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jnidzprbndcfrohgplmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  // Supabase doesn't have a direct way to list tables via JS client without RPC or special keys
  // but we can try to guess or use a workaround if we had access to pg_catalog.
  // Since we don't, I'll try to check if there's an 'inventory' or 'transactions' table to confirm names.
  
  const tablesToTry = ['clients', 'staff', 'services', 'inventory', 'transactions', 'appointment_staff', 'appointments', 'service_checklist_items'];
  for (const table of tablesToTry) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table '${table}' exists. Columns:`, data.length > 0 ? Object.keys(data[0]) : 'Empty');
    }
  }
}

listTables();
