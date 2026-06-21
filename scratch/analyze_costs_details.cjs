const ExcelJS = require('exceljs');

const file = 'C:\\Users\\Waiha\\Downloads\\Copia de Versión Actualizada de Costos, Ocupación y Rentabilidad.xlsx';

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const sheet = workbook.getWorksheet('Enero');
    if (!sheet) { console.log('Sheet Enero not found'); return; }

    console.log('Detailed Data from Enero (Costs/Profitability):');
    const data = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const rowData = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[colNumber - 1] = cell.value;
      });
      data.push(rowData);
    });
    data.slice(0, 50).forEach((row, i) => {
      if (row && row.length > 0 && row.some(cell => cell !== null)) {
        console.log(`Row ${i}:`, JSON.stringify(row));
      }
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
