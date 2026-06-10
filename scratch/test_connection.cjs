const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xptbgtjpakrbnpkohmpm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdGJndGpwYWtyYm5wa29obXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTE1ODUsImV4cCI6MjA5NjU4NzU4NX0.igysYnYKFPoHsLnKSTK4fQGR6UNE0UgDzRYXWLLPJxA'
);

async function test() {
  console.log('Testing connection to new Supabase...');
  const { data, error } = await supabase.from('clients').select('count', { count: 'exact' });
  
  if (error) {
    console.error('❌ Error connecting to Supabase:', error.message);
  } else {
    console.log('✅ Connection successful!');
    console.log('Clients count:', data.length);
  }
}

test();
