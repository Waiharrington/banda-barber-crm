
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://jnidzprbndcfrohgplmh.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE'
);

async function inspect() {
  // Intentamos traer el inventario tal cual
  const { data, error } = await supabase.from('inventory').select('*');
  if (error) {
    console.log("ERROR DETECTADO:", error.message);
    if (error.message.includes('column "category"')) {
       console.log("CONFIRMADO: La columna 'category' no existe.");
    }
  } else {
    console.log("COLUMNAS ENCONTRADAS:", data.length > 0 ? Object.keys(data[0]) : "Tabla vacía");
  }
}

inspect();
