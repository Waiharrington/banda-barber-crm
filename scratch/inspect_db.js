import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jnidzprbndcfrohgplmh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectColumns() {
  const table = process.argv[2] || 'staff';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching staff:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in staff table:', Object.keys(data[0]));
  } else {
    console.log('Staff table is empty.');
    // Try to insert a dummy record to see what happens
    const { error: insertError } = await supabase.from('staff').insert([{ name: 'Test' }]);
    console.log('Insert error (might show missing columns):', insertError);
  }
}

inspectColumns();
