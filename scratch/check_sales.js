import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jnidzprbndcfrohgplmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMaySales() {
  const { data: apps } = await supabase.from('appointments').select('*').gte('created_at', '2026-05-01');
  const { data: trans } = await supabase.from('transactions').select('*').gte('created_at', '2026-05-01');
  
  console.log('--- Appointments May 2026 ---');
  console.log(apps.length);
  apps.forEach(a => console.log(`App: ${a.id}, Status: ${a.status}, Price: ${a.total_price}, Staff: ${a.staff_id}`));

  console.log('\n--- Transactions May 2026 ---');
  console.log(trans.length);
  trans.forEach(t => console.log(`Trans: ${t.id}, Type: ${t.type}, Amount: ${t.amount}, Meta: ${JSON.stringify(t.metadata)}`));
}

checkMaySales();
