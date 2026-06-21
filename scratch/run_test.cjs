const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUpdateStock() {
  console.log("Fetching an inventory item...");
  const { data: items, error: fetchErr } = await supabase.from('inventory').select('*').limit(1);
  if (fetchErr) {
    console.error("Error fetching inventory:", fetchErr);
    return;
  }
  if (items.length === 0) {
    console.log("No inventory items found. Creating a dummy item...");
    const { data: newItem, error: createErr } = await supabase
      .from('inventory')
      .insert([{ name: 'Shampoo Test', stock: 10, price: 5 }])
      .select()
      .single();
    if (createErr) {
      console.error("Error creating item:", createErr);
      return;
    }
    items.push(newItem);
  }

  const targetItem = items[0];
  console.log("Target inventory item:", targetItem);

  console.log("Attempting to update stock using updateStock logic (with updated_at)...");
  const { data: updated, error: updateErr } = await supabase
    .from('inventory')
    .update({ stock: targetItem.stock, updated_at: new Date() })
    .eq('id', targetItem.id)
    .select()
    .single();

  if (updateErr) {
    console.error("Update FAILED:", updateErr);
  } else {
    console.log("Update SUCCEEDED:", updated);
  }
}

testUpdateStock().catch(console.error);
