import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jnidzprbndcfrohgplmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('name, category, is_for_sale');

  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

listInventory();
