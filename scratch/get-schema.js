async function getSchema() {
  const res = await fetch('https://jnidzprbndcfrohgplmh.supabase.co/rest/v1/', {
    headers: {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
    }
  });
  const data = await res.json();
  
  console.log('Definitions keys:', Object.keys(data.definitions || {}));
  console.log('appointment_extras columns:', data.definitions?.appointment_extras?.properties ? Object.keys(data.definitions.appointment_extras.properties) : 'Not found');
  console.log('appointment_products columns:', data.definitions?.appointment_products?.properties ? Object.keys(data.definitions.appointment_products.properties) : 'Not found');
}

getSchema();
