const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xptbgtjpakrbnpkohmpm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdGJndGpwYWtyYm5wa29obXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTE1ODUsImV4cCI6MjA5NjU4NzU4NX0.igysYnYKFPoHsLnKSTK4fQGR6UNE0UgDzRYXWLLPJxA'
);

async function run() {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

run();
