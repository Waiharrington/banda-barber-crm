const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: clients } = await supabase.from('clients').select('id');
  const { data: staff } = await supabase.from('staff').select('id, name');
  const { data: services } = await supabase.from('services').select('id');
  console.log(`Clients: ${clients?.length || 0}`);
  console.log(`Staff: ${staff?.length || 0}`);
  if (staff?.length) console.log(staff.map(s => s.name).join(', '));
  console.log(`Services: ${services?.length || 0}`);
}

check();
