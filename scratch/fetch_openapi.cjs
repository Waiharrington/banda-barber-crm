const fs = require('fs');
const path = require('path');
const https = require('https');

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

const options = {
  hostname: new URL(supabaseUrl).hostname,
  path: '/rest/v1/',
  headers: {
    'apikey': supabaseServiceKey,
    'Authorization': `Bearer ${supabaseServiceKey}`
  }
};

https.get(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const schema = JSON.parse(body);
      const tables = ['appointments', 'appointment_staff', 'appointment_extras', 'appointment_products', 'transactions', 'inventory', 'inventory_movements'];
      
      tables.forEach(table => {
        console.log(`\n=== Table: ${table} ===`);
        const definition = schema.definitions?.[table];
        if (definition && definition.properties) {
          Object.keys(definition.properties).forEach(col => {
            const prop = definition.properties[col];
            console.log(`- ${col}: ${prop.type} (${prop.format || ''})`);
          });
        } else {
          console.log(`No definition found for table ${table}`);
        }
      });
    } catch (e) {
      console.error("Failed to parse schema:", e.message);
      console.error(body.substring(0, 1000));
    }
  });
}).on('error', (err) => {
  console.error("Request error:", err.message);
});
