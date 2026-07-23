const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'pandabarber' }
});

async function main() {
  console.log('--- staff (name ilike juan) ---');
  const { data: staff, error: e1 } = await supabase.from('staff').select('*').ilike('name', '%juan%');
  if (e1) console.error(e1); else console.log(staff);

  const ids = (staff || []).map(s => s.id);

  console.log('--- turn_queue rows referencing those ids ---');
  if (ids.length) {
    const { data: tq, error: e2 } = await supabase.from('turn_queue').select('*').in('staff_id', ids);
    if (e2) console.error(e2); else console.log(tq);
  } else {
    console.log('(no staff ids to check, checking all turn_queue for orphans)');
    const { data: tqAll, error: e2b } = await supabase.from('turn_queue').select('*');
    if (e2b) console.error(e2b); else console.log(tqAll);
  }

  console.log('--- attendance_log rows referencing those ids ---');
  if (ids.length) {
    const { data: al, error: e3 } = await supabase.from('attendance_log').select('*').in('staff_id', ids);
    if (e3) console.error(e3); else console.log(al);
  }

  console.log('--- auth.users with email juan@pandabarber.com (via staff.auth_user_id join not directly queryable, skipping) ---');
}

main().catch(console.error);
