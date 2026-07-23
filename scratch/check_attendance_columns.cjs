const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'pandabarber' }
});

async function main() {
  console.log("Fetching a staff member...");
  const { data: staff, error: staffErr } = await supabase.from('staff').select('id, name').limit(1);
  if (staffErr) {
    console.error("Error fetching staff:", staffErr);
    return;
  }
  if (!staff || staff.length === 0) {
    console.log("No staff members found.");
    return;
  }
  const staffId = staff[0].id;
  console.log(`Found staff member: ${staff[0].name} (${staffId})`);
  
  console.log("Inserting test row into attendance_log...");
  const { data: inserted, error: insertErr } = await supabase
    .from('attendance_log')
    .insert([{ staff_id: staffId }])
    .select();
    
  if (insertErr) {
    console.error("Error inserting into attendance_log:", insertErr);
    return;
  }
  
  console.log("Insert success! Row columns and values:");
  console.log(inserted[0]);
  
  // Cleanup
  console.log("Cleaning up test row...");
  const { error: deleteErr } = await supabase
    .from('attendance_log')
    .delete()
    .eq('id', inserted[0].id);
  if (deleteErr) {
    console.error("Error deleting test row:", deleteErr);
  } else {
    console.log("Cleanup success!");
  }
}

main().catch(console.error);
