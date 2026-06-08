import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jnidzprbndcfrohgplmh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function restoreTestBirthday() {
  console.log("Restoring Wai's birthday to June 1st...");

  const { data, error } = await supabase
    .from('clients')
    .update({ birth_date: '1995-06-01' }) // Or whatever year, 06-01
    .eq('name', 'Wai')
    .select();

  if (error) {
    console.error('Error restoring birthday:', error.message);
  } else {
    console.log('Success! Wai\'s birthday has been restored to June 1st. Response data:', data);
  }
}

restoreTestBirthday();
