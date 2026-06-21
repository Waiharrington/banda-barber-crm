const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: apps } = await supabase.from('appointments').select('*').not('status', 'in', '("Completado","Cancelada")');
  console.log("Active Appointments:", JSON.stringify(apps, null, 2));
}

inspect();
