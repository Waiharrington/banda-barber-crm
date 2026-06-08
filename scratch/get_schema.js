const supabaseUrl = "https://jnidzprbndcfrohgplmh.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE";

async function getSchema() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Accept': 'application/openapi+json'
      }
    });
    const data = await res.json();
    console.log('--- DB API SPEC ---');
    console.log('Paths available:', Object.keys(data.paths || {}));
  } catch (err) {
    console.error('Error fetching schema spec:', err);
  }
}

getSchema();
