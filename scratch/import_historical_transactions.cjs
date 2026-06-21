require('dotenv').config();

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');

const DEFAULT_CSV = 'C:/Users/Waiha/Downloads/_Registro de Ingresos ASTRO - HISTORIAL (2).csv';
const SERVICE_ROLE_FILE = 'C:/Users/Waiha/Downloads/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ.txt';
const BCV_URLS = [
  'https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/2_1_2a26_smc.xls',
  'https://www.bcv.org.ve/sites/default/files/EstadisticasGeneral/2_1_2b26_smc.xls'
];
const bcvHttpsAgent = new https.Agent({ rejectUnauthorized: false });

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const csvArg = process.argv.find(arg => arg.startsWith('--csv='));
const csvPath = csvArg ? csvArg.slice('--csv='.length) : DEFAULT_CSV;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  || (fs.existsSync(SERVICE_ROLE_FILE) ? fs.readFileSync(SERVICE_ROLE_FILE, 'utf8').trim() : '');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or service role key.');
  process.exit(1);
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found: ${csvPath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: bcvHttpsAgent }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(new URL(res.headers.location, url).toString()).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Download failed ${res.statusCode}: ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function parseNumber(value) {
  const normalized = String(value || '')
    .replace(/Bs\.?/gi, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseBcvNumber(value) {
  const number = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : null;
}

function parseCsvDate(raw) {
  const match = String(raw || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh = '0', mi = '0', ss = '0'] = match;
  const isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const timeMissing = !String(raw || '').includes(':');
  return {
    isoDate,
    timestamp: `${isoDate}T${hh.padStart(2, '0')}:${mi.padStart(2, '0')}:${ss.padStart(2, '0')}-04:00`,
    timeMissing
  };
}

function parseDmyFromCell(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

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

async function loadBcvRates() {
  const tempDir = path.join(__dirname, 'tmp_bcv_rates');
  fs.mkdirSync(tempDir, { recursive: true });

  const rates = [];
  for (const url of BCV_URLS) {
    const fileName = path.basename(url);
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, await download(url));

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    for (const sheet of workbook.worksheets) {
      const rows = await readSheetAsArrays(workbook, sheet.name);
      if (!rows) continue;
      const operationDate = parseDmyFromCell(rows[2]?.[0]);
      const valueDate = parseDmyFromCell(rows[2]?.[2]);
      const usdRow = rows.find(row => String(row[0] || '').trim() === 'USD');
      if (!operationDate || !usdRow) continue;
      rates.push({
        operationDate,
        valueDate,
        buy: parseBcvNumber(usdRow[4]),
        sell: parseBcvNumber(usdRow[5]),
        sourceUrl: url,
        sheetName: sheet.name
      });
    }
  }

  fs.rmSync(tempDir, { recursive: true, force: true });
  return rates
    .filter(rate => rate.sell)
    .sort((a, b) => a.operationDate.localeCompare(b.operationDate));
}

function findRateForDate(rates, isoDate) {
  for (let i = rates.length - 1; i >= 0; i -= 1) {
    if (rates[i].operationDate <= isoDate) return rates[i];
  }
  return null;
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function buildStaffMap(staffRows) {
  const map = new Map();
  for (const staff of staffRows) {
    if (String(staff.role || '').startsWith('ARCHIVED|')) continue;
    map.set(normalizeName(staff.name).toLowerCase(), staff);
  }
  return map;
}

async function backupTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;

  const backupDir = path.join(__dirname, 'transaction_backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `transactions_before_historical_import_${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data || [], null, 2));
  return { backupPath, count: data?.length || 0 };
}

async function deleteAllTransactions() {
  const { data, error } = await supabase.from('transactions').select('id');
  if (error) throw error;
  const ids = (data || []).map(row => row.id);
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { error: deleteError } = await supabase.from('transactions').delete().in('id', chunk);
    if (deleteError) throw deleteError;
  }
  return ids.length;
}

async function insertTransactions(rows) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabase.from('transactions').insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
  }
  return inserted;
}

function summarize(rows) {
  const byBarber = {};
  const byService = {};
  const byMethod = {};
  for (const row of rows) {
    const meta = row.metadata || {};
    const barber = meta.barberName || '(vacio)';
    const service = meta.serviceName || '(vacio)';
    const method = meta.paymentMethod || '(vacio)';
    byBarber[barber] ||= { count: 0, bs: 0, usd: 0 };
    byBarber[barber].count += 1;
    byBarber[barber].bs += meta.amountBs || 0;
    byBarber[barber].usd += row.amount || 0;
    byService[service] = (byService[service] || 0) + 1;
    byMethod[method] = (byMethod[method] || 0) + 1;
  }
  return {
    count: rows.length,
    totalBs: rows.reduce((sum, row) => sum + (row.metadata?.amountBs || 0), 0),
    totalUsd: rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    byBarber,
    byService,
    byMethod,
    timeMissing: rows.filter(row => row.metadata?.timeMissing).length
  };
}

(async () => {
  const [rates, staffResult] = await Promise.all([
    loadBcvRates(),
    supabase.from('staff').select('id,name,role')
  ]);
  if (staffResult.error) throw staffResult.error;

  const staffMap = buildStaffMap(staffResult.data || []);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    console.warn('CSV parse warnings:', parsed.errors.slice(0, 5));
  }

  const importRows = [];
  const errors = [];

  parsed.data.forEach((sourceRow, index) => {
    const rawDate = sourceRow.FECHA;
    const parsedDate = parseCsvDate(rawDate);
    const amountBs = parseNumber(sourceRow['MOONTO '] || sourceRow.MOONTO || sourceRow.MONTO);
    const barberName = normalizeName(sourceRow.BARBERO);
    const staff = staffMap.get(barberName.toLowerCase());
    const rate = parsedDate ? findRateForDate(rates, parsedDate.isoDate) : null;

    if (!parsedDate) errors.push(`Row ${index + 2}: invalid FECHA "${rawDate}"`);
    if (amountBs == null) errors.push(`Row ${index + 2}: invalid amount "${sourceRow['MOONTO ']}"`);
    if (!staff) errors.push(`Row ${index + 2}: unknown barber "${barberName}"`);
    if (!rate) errors.push(`Row ${index + 2}: no BCV rate for "${rawDate}"`);
    if (!parsedDate || amountBs == null || !staff || !rate) return;

    const amountUsd = Number((amountBs / rate.sell).toFixed(6));
    const clientName = normalizeName(sourceRow.CLIENTE) || 'Cliente historico';
    const serviceName = normalizeName(sourceRow.SERVICIO) || 'Servicio historico';
    const paymentMethod = normalizeName(sourceRow['METODO DE PAGO '] || sourceRow['METODO DE PAGO']) || 'No registrado';
    const didWash = String(sourceRow.LAVADO || '').trim() === '1';

    importRows.push({
      type: 'income',
      amount: amountUsd,
      category: 'Ventas Astro',
      created_at: parsedDate.timestamp,
      description: `VENTA HISTORICA - Cliente: ${clientName} - Servi: ${serviceName}`,
      exchange_rate: rate.sell,
      currency: 'USD',
      metadata: {
        importedHistorical: true,
        source: path.basename(csvPath),
        rawRow: index + 2,
        closeDay: sourceRow['Dia de Cierre'] || null,
        rawDate,
        timeMissing: parsedDate.timeMissing,
        originalClientName: clientName,
        clientName,
        barberName,
        serviceName,
        paymentMethod,
        didWash,
        washCount: didWash ? 1 : 0,
        amountBs,
        bcvRate: rate.sell,
        bcvRateType: 'Venta USD BCV SMC',
        bcvRateOperationDate: rate.operationDate,
        bcvRateValueDate: rate.valueDate,
        bcvSourceUrl: rate.sourceUrl,
        staffInvolved: [{
          staffId: staff.id,
          name: staff.name,
          role: staff.role,
          commissionEarned: amountUsd,
          commissionBs: amountBs,
          productCommissionBs: 0,
          tipBs: 0
        }]
      }
    });
  });

  if (errors.length) {
    console.error('Import validation failed:');
    errors.slice(0, 25).forEach(error => console.error(error));
    if (errors.length > 25) console.error(`...and ${errors.length - 25} more`);
    process.exit(1);
  }

  const summary = summarize(importRows);
  console.log(JSON.stringify({
    mode: execute ? 'EXECUTE' : 'DRY_RUN',
    csvPath,
    bcvRatesLoaded: rates.length,
    firstRate: rates[0],
    lastRate: rates[rates.length - 1],
    ...summary
  }, null, 2));

  if (!execute) {
    console.log('Dry run only. Re-run with --execute to backup, delete current transactions, and import.');
    return;
  }

  const backup = await backupTransactions();
  console.log(`Backup written: ${backup.backupPath} (${backup.count} transactions)`);

  const deleted = await deleteAllTransactions();
  console.log(`Deleted current transactions: ${deleted}`);

  const inserted = await insertTransactions(importRows);
  console.log(`Inserted historical transactions: ${inserted}`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
