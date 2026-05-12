
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(t => {
    console.log(`ID: ${t.id} | Desc: ${t.description}`);
    console.log(`Meta: ${JSON.stringify(t.metadata)}`);
    console.log('---');
  });
}

checkTransactions();
