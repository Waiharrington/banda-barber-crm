const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'pandabarber' } });
async function main() {
  const { error } = await supabase.from('turn_queue').delete().eq('id', '3a558e32-deb1-4f85-ac27-1ff182710418');
  if (error) return console.error('delete failed:', error);
  console.log('Deleted duplicate turn_queue row for Moret Serrano (position 5).');
  const { data } = await supabase.from('turn_queue').select('*');
  console.log('Remaining rows:', data.length, data);
}
main();
