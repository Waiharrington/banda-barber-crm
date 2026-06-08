require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function clearOldData() {
  console.log("Iniciando limpieza completa de datos de prueba...");

  try {
    // 1. Clear Commissions (appointment_staff)
    const { error: staffError } = await supabase
      .from('appointment_staff')
      .delete()
      .not('id', 'is', null);
    if (staffError) throw staffError;
    console.log(`- Comisiones (appointment_staff) eliminadas.`);

    // 2. Clear appointment extras
    const { error: extrasError } = await supabase
      .from('appointment_extras')
      .delete()
      .not('id', 'is', null);
    if (extrasError) throw extrasError;
    console.log(`- Extras vinculados a citas eliminados.`);

    // 3. Clear appointment products
    const { error: productsError } = await supabase
      .from('appointment_products')
      .delete()
      .not('id', 'is', null);
    if (productsError) throw productsError;
    console.log(`- Productos vinculados a citas eliminados.`);

    // 4. Clear Appointments
    const { error: appError } = await supabase
      .from('appointments')
      .delete()
      .not('id', 'is', null);
    if (appError) throw appError;
    console.log(`- Citas (appointments) eliminadas.`);

    // 5. Clear Transactions
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .not('id', 'is', null);
    if (txError) throw txError;
    console.log(`- Transacciones eliminadas.`);

    console.log("✅ Limpieza completada con éxito. El sistema completo está limpio y listo para probar de cero.");
  } catch (err) {
    console.error("❌ Error durante la limpieza:", err.message);
  }
}

clearOldData();
