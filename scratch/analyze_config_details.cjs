const XLSX = require('xlsx');
const fs = require('fs');

const file = 'C:\\Users\\Waiha\\Downloads\\_Registro de Ingresos ASTRO.xlsx';

try {
  const workbook = XLSX.readFile(file);
  const sheet = workbook.Sheets['AJUSTES'] || workbook.Sheets['DATOS'];
  if (!sheet) {
    console.log('Sheet not found');
    return;
  }
  const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
  
  console.log('Detailed Data from Config Sheet:');
  data.slice(0, 20).forEach((row, i) => {
    console.log(`Row ${i}:`, JSON.stringify(row));
  });
} catch (e) {
  console.error('Error:', e.message);
}
