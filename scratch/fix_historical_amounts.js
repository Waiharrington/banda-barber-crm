import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function fixAmounts() {
  console.log('Fetching historical transactions...');
  const { data, error } = await supabase
    .from('transactions')
    .select('id, amount, metadata')
    .eq('metadata->>isHistorical', 'true');
    
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  console.log(`Found ${data.length} historical transactions.`);
  
  for (const t of data) {
    // Only multiply if it seems it was parsed as a small decimal (e.g. < 100)
    // If it's already large (e.g. someone ran this twice), skip.
    if (t.amount < 100 && t.amount > 0) {
      const newAmount = t.amount * 1000;
      await supabase
        .from('transactions')
        .update({ amount: newAmount })
        .eq('id', t.id);
    }
  }
  
  console.log('Done fixing amounts.');
}

fixAmounts();
