import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('staff').select('*').limit(1);
  if (error) {
    console.error("Error fetching staff:", error);
    return;
  }
  if (data && data.length > 0) {
    console.log("STAFF COLUMNS IN DB:", Object.keys(data[0]));
  } else {
    console.log("No staff found in DB.");
  }
}

check();
