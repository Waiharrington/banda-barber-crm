const XLSX = require('xlsx');
const fs = require('fs');

const files = [
  'C:\\Users\\Waiha\\Downloads\\_Registro de Ingresos ASTRO.xlsx',
  'C:\\Users\\Waiha\\Downloads\\Copia de Versión Actualizada de Costos, Ocupación y Rentabilidad.xlsx'
];

files.forEach(file => {
  console.log('--- FILE:', file, '---');
  try {
    if (!fs.existsSync(file)) {
      console.log('File does not exist!');
      return;
    }
    const workbook = XLSX.readFile(file);
    console.log('Sheets:', workbook.SheetNames);
    
    workbook.SheetNames.forEach(sheetName => {
      console.log('Sheet:', sheetName);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, {header: 1});
      console.log('Headers:', JSON.stringify(data[0]));
      console.log('Sample Rows (up to 3):', JSON.stringify(data.slice(1, 4)));
    });
  } catch (e) {
    console.error('Error reading file:', e.message);
  }
  console.log('\n');
});
