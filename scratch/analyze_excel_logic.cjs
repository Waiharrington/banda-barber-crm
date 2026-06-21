const ExcelJS = require('exceljs');
const fs = require('fs');

const files = [
  'C:\\Users\\Waiha\\Downloads\\_Registro de Ingresos ASTRO.xlsx',
  'C:\\Users\\Waiha\\Downloads\\Copia de Versión Actualizada de Costos, Ocupación y Rentabilidad.xlsx'
];

(async () => {
  for (const file of files) {
    console.log('--- FILE:', file, '---');
    try {
      if (!fs.existsSync(file)) {
        console.log('File does not exist!');
        continue;
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(file);
      console.log('Sheets:', workbook.worksheets.map(s => s.name));

      for (const sheet of workbook.worksheets) {
        console.log('Sheet:', sheet.name);
        const data = [];
        sheet.eachRow({ includeEmpty: true }, (row) => {
          const rowData = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            rowData[colNumber - 1] = cell.value;
          });
          data.push(rowData);
        });
        console.log('Headers:', JSON.stringify(data[0]));
        console.log('Sample Rows (up to 3):', JSON.stringify(data.slice(1, 4)));
      }
    } catch (e) {
      console.error('Error reading file:', e.message);
    }
    console.log('\n');
  }
})();
