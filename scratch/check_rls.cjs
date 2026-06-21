const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
  const { data: q, error: qErr } = await supabase.from('turn_queue').select('*').limit(1);
  if (qErr) {
    console.error("Query failed:", qErr);
    return;
  }
  if (q && q.length > 0) {
    const item = q[0];
    console.log("Attempting to update turn_queue item as anon client:", item.id);
    const { data: updated, error: uErr } = await supabase.from('turn_queue').update({ position: item.position }).eq('id', item.id).select();
    if (uErr) {
      console.error("Update failed:", uErr);
    } else {
      console.log("Update succeeded:", updated);
    }
  } else {
    console.log("No queue items found to test update");
  }
}

checkRLS();
