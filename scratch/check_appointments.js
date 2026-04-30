import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jnidzprbndcfrohgplmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppointments() {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      created_at,
      scheduled_at,
      status,
      clients (name)
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Last 20 appointments:');
  data.forEach(a => {
    console.log(`ID: ${a.id}, Client: ${a.clients?.name}, Status: ${a.status}, Created: ${a.created_at}, Scheduled: ${a.scheduled_at}`);
  });
}

checkAppointments();
