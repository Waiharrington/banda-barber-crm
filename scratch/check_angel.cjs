const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY, { db: { schema: 'pandabarber' } });
async function main() {
  const { data, error } = await supabase.from('staff').select('id,name,role,badge,specialty').order('name');
  if (error) return console.error(error);
  console.log(data);
}
main();
