import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jnidzprbndcfrohgplmh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setTestBirthday() {
  const todayStr = new Date().toISOString().split('T')[0]; // Gets today's date (2026-06-05)
  console.log(`Setting Wai's birthday to today: ${todayStr}`);

  const { data, error } = await supabase
    .from('clients')
    .update({ birth_date: todayStr })
    .eq('name', 'Wai')
    .select();

  if (error) {
    console.error('Error updating test birthday:', error.message);
  } else {
    console.log('Success! Wai\'s birthday is now set to today. Response data:', data);
  }
}

setTestBirthday();
