import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'pandabarber' }
});

const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const authClient = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    storageKey: 'sb-authclient-auth-token',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: { schema: 'pandabarber' }
});
