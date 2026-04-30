
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function checkServices() {
  const { data, error } = await supabase.from('services').select('*').limit(1);
  if (error) {
    console.error('Error fetching services:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columnas de Servicios:', Object.keys(data[0]));
  } else {
    console.log('No hay servicios para ver columnas.');
  }
}

checkServices();
