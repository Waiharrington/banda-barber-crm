import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function checkRealData() {
  const { data: apps, error } = await supabase.from('appointments')
    .select('*, appointment_extras(*), appointment_products(*)')
    .limit(10);
  
  if (error) {
    console.error(error);
    return;
  }
  
  for (const app of apps) {
    if (app.appointment_extras && app.appointment_extras.length > 0) {
      console.log('Real appointment_extras keys:', Object.keys(app.appointment_extras[0]));
    }
    if (app.appointment_products && app.appointment_products.length > 0) {
      console.log('Real appointment_products keys:', Object.keys(app.appointment_products[0]));
    }
  }
  console.log('Done scanning.');
}

checkRealData();
