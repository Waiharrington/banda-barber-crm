
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jnidzprbndcfrohgplmh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking tables...');
  const tables = ['settings', 'config', 'exchange_rates', 'extras', 'service_extras'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    if (!error) {
      console.log(`Table ${t} exists! Rows:`, data);
    } else {
      console.log(`Table ${t} error:`, error.message);
    }
  }
}

check();
