import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function testInsert() {
  // Let's try to insert an extra with a staff_id
  const { data, error } = await supabase.from('appointment_extras').insert([{
    appointment_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
    extra_id: '00000000-0000-0000-0000-000000000000',
    price: 0,
    staff_id: '00000000-0000-0000-0000-000000000000'
  }]);
  
  console.log('Error message:', error?.message);
}

testInsert();
