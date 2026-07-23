const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'pandabarber' } });
async function main() {
  const id = 'a5952cf4-2340-4064-8eae-88097ba86d69';
  const { data, error } = await supabase.from('staff').delete().eq('id', id).select();
  if (error) return console.error('delete failed:', error);
  console.log('Deleted staff row:', data);
}
main();
