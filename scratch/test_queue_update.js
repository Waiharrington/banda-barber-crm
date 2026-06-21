const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// We need to import dataService, but it's a front-end ES module.
// Let's just recreate the updateQueueStatus logic in this script and run it, or import the module.
// Since package.json is type: module, let's write a .js script that imports dataService.js.
