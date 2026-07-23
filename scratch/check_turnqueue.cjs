const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'pandabarber' } });
async function main() {
  const { data: tq, error } = await supabase.from('turn_queue').select('*');
  if (error) return console.error(error);
  console.log('turn_queue rows:', tq.length);
  console.log(tq);
  const staffIds = tq.map(t => t.staff_id);
  const { data: staff } = await supabase.from('staff').select('id,name,role').in('id', staffIds);
  console.log('matching staff:', staff);
}
main();
