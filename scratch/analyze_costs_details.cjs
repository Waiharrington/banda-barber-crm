const XLSX = require('xlsx');
const fs = require('fs');

const file = 'C:\\Users\\Waiha\\Downloads\\Copia de Versión Actualizada de Costos, Ocupación y Rentabilidad.xlsx';

try {
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets['Enero'];
  const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
  
  console.log('Detailed Data from Enero (Costs/Profitability):');
  data.slice(0, 50).forEach((row, i) => {
    // Only log rows that are not empty
    if (row && row.length > 0 && row.some(cell => cell !== null)) {
      console.log(`Row ${i}:`, JSON.stringify(row));
    }
  });
} catch (e) {
  console.error('Error:', e.message);
}
