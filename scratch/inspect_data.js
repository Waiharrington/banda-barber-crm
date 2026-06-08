import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jnidzprbndcfrohgplmh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
  const { data, error } = await supabase
    .from('staff')
    .update({ birth_date: '1995-06-12' })
    .eq('name', 'Aidan ')
    .select();
    
  if (error) {
    console.log('Update failed as expected if column does not exist:', error.message);
  } else {
    console.log('Update succeeded! The column birth_date exists in staff table:', data);
  }
}

testUpdate();
