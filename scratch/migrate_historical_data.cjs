require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function migrate() {
  const filePath = 'C:\\Users\\Waiha\\Downloads\\_Registro de Ingresos ASTRO - HISTORIAL.csv';
  console.log('Reading CSV from:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found!');
    return;
  }

  const csvText = fs.readFileSync(filePath, 'utf-8');
  
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
  const dataLines = lines.slice(1);
  
  console.log(`Found ${dataLines.length} data rows.`);

  // Get staff
  const { data: staffData, error: staffError } = await supabase.from('staff').select('*');
  if (staffError) {
    console.error('Error fetching staff:', staffError);
    return;
  }
  
  const staffMap = {};
  if (staffData) {
    staffData.forEach(s => {
      // Create a map to quickly find staff by name or partial match
      staffMap[s.name.toLowerCase().trim()] = { id: s.id, role: s.role, name: s.name };
    });
  }

  const transactions = [];

  for (let idx = 0; idx < dataLines.length; idx++) {
    const line = dataLines[idx];
    const cols = line.split(',');
    if (cols.length < 8) continue;

    const fechaStr = cols[1].trim(); 
    const cliente = cols[2].trim();
    const barberoStr = cols[3].trim().toLowerCase();
    const servicio = cols[4].trim();
    const metodoStr = cols[5].trim();
    const lavadoStr = cols[6].trim();
    const montoStr = cols[7].trim(); // e.g. "4.850Bs."

    let createdAt = new Date();
    try {
      const parts = fechaStr.split(' ');
      const dateParts = parts[0].split('/');
      
      if (parts.length > 1) {
        const timeParts = parts[1].split(':');
        createdAt = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], timeParts[0], timeParts[1], timeParts[2]);
      } else {
        createdAt = new Date(dateParts[2], dateParts[1] - 1, dateParts[0], 12, 0, 0); // Default to noon if no time
      }
    } catch (e) {
      console.log('Error parsing date:', fechaStr);
    }

    // Parse amount
    const parsedAmount = parseFloat(montoStr.replace(/[^\d.,]/g, '').replace(',', '.'));
    let amount = isNaN(parsedAmount) ? 0 : parsedAmount;

    const staffInvolved = [];
    if (staffMap[barberoStr]) {
      staffInvolved.push({
        staffId: staffMap[barberoStr].id,
        name: staffMap[barberoStr].name,
        role: staffMap[barberoStr].role,
        commissionAmount: 0 
      });
    } else {
      // If barber name has a typo, try to find a partial match
      const matched = Object.keys(staffMap).find(k => k.includes(barberoStr) || barberoStr.includes(k));
      if (matched) {
        staffInvolved.push({
          staffId: staffMap[matched].id,
          name: staffMap[matched].name,
          role: staffMap[matched].role,
          commissionAmount: 0 
        });
      } else {
        console.log(`Row ${idx+2}: Barber not found for "${barberoStr}"`);
      }
    }

    // Map payment method
    let paymentMethod = 'cash';
    if (metodoStr.toLowerCase().includes('movil')) paymentMethod = 'pago_movil';
    else if (metodoStr.toLowerCase().includes('zelle')) paymentMethod = 'zelle';
    else if (metodoStr.toLowerCase().includes('punto') || metodoStr.toLowerCase().includes('tarjeta')) paymentMethod = 'card';
    
    transactions.push({
      type: 'income',
      amount: amount,
      category: 'Historial Ingresos',
      currency: 'VES',
      description: `Historial - ${cliente} - Servi: ${servicio}`,
      created_at: createdAt.toISOString(),
      metadata: {
        clientName: cliente,
        serviceName: servicio,
        didWash: lavadoStr === '1',
        staffInvolved: staffInvolved,
        method_bs: paymentMethod,
        isHistorical: true
      }
    });
  }

  console.log(`Prepared ${transactions.length} transactions. Inserting into database in batches...`);

  let successCount = 0;
  for (let i = 0; i < transactions.length; i += 50) {
    const batch = transactions.slice(i, i + 50);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) {
      console.error('Error inserting batch at index', i, error);
    } else {
      successCount += batch.length;
      console.log(`Inserted batch ${i / 50 + 1}... (${successCount} total)`);
    }
  }

  console.log(`Migration completed successfully! Total inserted: ${successCount}`);
}

migrate();
