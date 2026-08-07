import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.somosdostudio.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhoa2VhZ3VhbXl6aWFtcGp2d2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM2MjA4NywiZXhwIjoyMDk4NzIyMDg3fQ.9GlE7A7-VTxM_yeP9EHMmGYYgZ78H0svtuSN8QgSPsQ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'pandabarber' }
});

async function run() {
  const { data: apps, error } = await supabase
    .from('appointments')
    .select('id, client_id, created_at, scheduled_at, completed_at, status, clients(name)')
    .gte('created_at', '2026-08-06T00:00:00Z')
    .limit(50);

  if (error) {
    console.error("Error fetching appointments:", error);
    return;
  }

  console.log(`=== APPOINTMENTS CREATED TODAY (${apps.length}) ===`);
  
  // Find clients who have only 1 appointment ever or whose first appointment is today
  const clientAppCounts = {};
  for (const a of apps) {
    const cid = a.client_id;
    if (cid) {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', cid);
      
      console.log(`AppId: ${a.id} | Client: ${a.clients?.name} (ID: ${cid}) | AppCount: ${count} | Status: ${a.status}`);
    }
  }
}

run();
