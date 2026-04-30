
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function testChecklist() {
  const { data, error } = await supabase.from('service_checklist_items').select('*');
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Ítems encontrados:', data.length);
    console.log(data);
  }
}

testChecklist();
