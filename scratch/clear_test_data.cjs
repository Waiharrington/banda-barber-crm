
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function clearOldData() {
  console.log("Iniciando limpieza de datos de prueba...");

  try {
    // 1. Clear Transactions
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (txError) throw txError;
    console.log(`- Transacciones eliminadas.`);

    // 2. Clear Commissions (appointment_staff)
    const { error: staffError } = await supabase
      .from('appointment_staff')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (staffError) throw staffError;
    console.log(`- Registros de comisiones eliminados.`);

    console.log("✅ Limpieza completada con éxito. El sistema financiero está listo para datos reales.");
  } catch (err) {
    console.error("❌ Error durante la limpieza:", err.message);
  }
}

clearOldData();
