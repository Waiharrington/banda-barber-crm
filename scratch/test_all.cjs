const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testAll() {
  try {
    console.log("Starting Promise.all...");
    const results = await Promise.all([
      supabase.from('clients').select('*, appointments(*)'),
      supabase.from('services').select('*'),
      supabase.from('staff').select('*'),
      supabase.from('service_extras').select('*').order('name', { ascending: true }),
      supabase.from('inventory').select('*').order('name', { ascending: true }),
      supabase.from('appointments').select(`
        *,
        clients(*),
        services(*),
        staff(*),
        appointment_extras(id, price, service_extras(name)),
        appointment_products(id, price, quantity, inventory(name)),
        appointment_staff(staff_id, role, commission_pct, commission_earned)
      `).in('status', ['En Silla', 'Agendado', 'En Lavado', 'Completado', 'Por Pagar'])
    ]);
    console.log("All resolved!");
    console.log(results.map(r => r.error ? `ERROR: ${r.error.message}` : `OK: ${r.data.length}`));
  } catch (err) {
    console.error("Crash:", err);
  }
}
testAll();
