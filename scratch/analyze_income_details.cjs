const ExcelJS = require('exceljs');

const file = 'C:\\Users\\Waiha\\Downloads\\_Registro de Ingresos ASTRO.xlsx';

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    console.log('Sheets:', workbook.worksheets.map(s => s.name));

    const sheet = workbook.getWorksheet('ANALISIS');
    if (!sheet) { console.log('Sheet ANALISIS not found'); return; }

    const data = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[colNumber - 1] = cell.value;
      });
      data.push(rowData);
    });
    console.log('Detailed Data from ANALISIS:');
    data.slice(0, 20).forEach((row, i) => {
      console.log(`Row ${i}:`, JSON.stringify(row));
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
