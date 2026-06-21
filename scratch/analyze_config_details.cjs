const ExcelJS = require('exceljs');

const file = 'C:\\Users\\Waiha\\Downloads\\_Registro de Ingresos ASTRO.xlsx';

async function readSheetAsArrays(workbook, sheetName) {
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) return null;
  const data = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    const rowData = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      rowData[colNumber - 1] = cell.value;
    });
    data.push(rowData);
  });
  return data;
}

(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file);
    const data = await readSheetAsArrays(workbook, 'AJUSTES')
      || await readSheetAsArrays(workbook, 'DATOS');
    if (!data) {
      console.log('Sheet not found');
      return;
    }
    console.log('Detailed Data from Config Sheet:');
    data.slice(0, 20).forEach((row, i) => {
      console.log(`Row ${i}:`, JSON.stringify(row));
    });
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
