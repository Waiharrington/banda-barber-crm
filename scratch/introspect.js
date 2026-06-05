import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function inspectSchema() {
  const { error: err1 } = await supabase.from('appointment_extras').insert([{
    __invalid_col_name__: 'test'
  }]);
  console.log('appointment_extras error:', err1?.message || err1);

  const { error: err2 } = await supabase.from('appointment_products').insert([{
    __invalid_col_name__: 'test'
  }]);
  console.log('appointment_products error:', err2?.message || err2);
}

inspectSchema();
