const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xptbgtjpakrbnpkohmpm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdGJndGpwYWtyYm5wa29obXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTE1ODUsImV4cCI6MjA5NjU4NzU4NX0.igysYnYKFPoHsLnKSTK4fQGR6UNE0UgDzRYXWLLPJxA'
);

async function run() {
  const { data: test1, error: error1 } = await supabase
    .from('appointments')
    .select('custom_price')
    .limit(1);
  
  console.log('custom_price test error:', error1?.message || 'none');

  const { data: test2, error: error2 } = await supabase
    .from('appointments')
    .select('custom_service_price')
    .limit(1);
  
  console.log('custom_service_price test error:', error2?.message || 'none');
}

run();
