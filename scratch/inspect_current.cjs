const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: queue } = await supabase.from('turn_queue').select('*, staff(*)').order('position');
  console.log("Queue:", JSON.stringify(queue, null, 2));

  const { data: appointments } = await supabase.from('appointments').select('*, clients(*), services(*)').in('status', ['En Silla', 'Por Pagar']);
  console.log("Active Appointments:", JSON.stringify(appointments, null, 2));
}

inspect();
