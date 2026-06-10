const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: staff } = await supabase.from('staff').select('id, name, role');
  console.log(staff);
}

check();
