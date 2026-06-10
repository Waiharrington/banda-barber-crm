/**
 * ASTRO BARBER CRM — Full Supabase Backup
 * Exports all table data to JSON files + generates schema SQL
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const SUPABASE_URL = 'https://jnidzprbndcfrohgplmh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWR6cHJibmRjZnJvaGdwbG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTY5NDIsImV4cCI6MjA5MjI3Mjk0Mn0.3ClLTGAXBxEgKKmX_B4xGoR1RR-hmRC2cxN01Jy6NRE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLES = [
  'clients',
  'staff',
  'services',
  'service_extras',
  'service_checklist_items',
  'inventory',
  'inventory_movements',
  'appointments',
  'appointment_extras',
  'appointment_products',
  'appointment_staff',
  'transactions',
];

async function exportTable(tableName) {
  console.log(`📦 Exporting: ${tableName}...`);
  
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + pageSize - 1);
    
    if (error) {
      console.error(`  ❌ Error in ${tableName}:`, error.message);
      return [];
    }
    
    allData = allData.concat(data);
    console.log(`  ✅ ${tableName}: fetched ${allData.length} rows so far...`);
    
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allData;
}

async function main() {
  const backupDir = './scratch/backup_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  mkdirSync(backupDir, { recursive: true });
  
  console.log('\n🚀 ASTRO BARBER CRM — Starting full backup...\n');
  console.log(`📁 Output directory: ${backupDir}\n`);
  
  const backup = {};
  let totalRows = 0;
  
  for (const table of TABLES) {
    const data = await exportTable(table);
    backup[table] = data;
    totalRows += data.length;
    
    // Save individual file per table
    writeFileSync(
      `${backupDir}/${table}.json`,
      JSON.stringify(data, null, 2)
    );
  }
  
  // Save full combined backup
  writeFileSync(
    `${backupDir}/_FULL_BACKUP.json`,
    JSON.stringify(backup, null, 2)
  );
  
  // Generate schema SQL based on data structure
  const schemaSQL = generateSchemaSQL(backup);
  writeFileSync(`${backupDir}/_SCHEMA.sql`, schemaSQL);
  
  // Generate import SQL
  const importSQL = generateImportSQL(backup);
  writeFileSync(`${backupDir}/_IMPORT_DATA.sql`, importSQL);
  
  console.log('\n════════════════════════════════════════════');
  console.log('✅ BACKUP COMPLETE!');
  console.log(`📊 Total rows exported: ${totalRows}`);
  console.log(`📁 Files saved to: ${backupDir}`);
  console.log('════════════════════════════════════════════');
  console.log('\nFiles created:');
  TABLES.forEach(t => console.log(`  • ${t}.json (${backup[t].length} rows)`));
  console.log(`  • _FULL_BACKUP.json (combined)`);
  console.log(`  • _SCHEMA.sql (table definitions)`);
  console.log(`  • _IMPORT_DATA.sql (INSERT statements)`);
  console.log('\n📌 NEXT STEPS:');
  console.log('  1. Create new Supabase project at supabase.com');
  console.log('  2. Run _SCHEMA.sql in SQL Editor of new project');
  console.log('  3. Run _IMPORT_DATA.sql to restore all data');
  console.log('  4. Update .env with new URL and ANON_KEY');
  console.log('  5. Update Vercel env vars and redeploy\n');
}

function generateSchemaSQL(backup) {
  return `-- ================================================
-- ASTRO BARBER CRM — Database Schema
-- Generated: ${new Date().toISOString()}
-- ================================================
-- Run this FIRST in your new Supabase SQL Editor
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── CLIENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  id_card TEXT UNIQUE,
  birth_date DATE,
  hair_type TEXT,
  notes TEXT,
  work_gallery TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  allergies TEXT,
  preferred_barber_id UUID
);

-- ── STAFF ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  commission_pct NUMERIC DEFAULT 40,
  commission_washer NUMERIC DEFAULT 10,
  commission_cashier NUMERIC DEFAULT 5,
  commission_receptionist NUMERIC DEFAULT 5,
  tools TEXT[] DEFAULT '{}',
  stats JSONB DEFAULT '{}'
);

-- ── SERVICES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  category TEXT,
  description TEXT,
  duration_min INTEGER DEFAULT 30,
  included_items TEXT[] DEFAULT '{}',
  commission_barber NUMERIC DEFAULT 40,
  commission_washer NUMERIC DEFAULT 10,
  commission_cashier NUMERIC DEFAULT 5,
  commission_receptionist NUMERIC DEFAULT 5
);

-- ── SERVICE EXTRAS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS service_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  category TEXT
);

-- ── SERVICE CHECKLIST ITEMS ────────────────────────
CREATE TABLE IF NOT EXISTS service_checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  base_cost NUMERIC DEFAULT 0
);

-- ── INVENTORY ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  category TEXT,
  stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 5,
  cost NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  commission_pct NUMERIC DEFAULT 10,
  unit TEXT DEFAULT 'unidad',
  supplier TEXT,
  notes TEXT,
  is_for_sale BOOLEAN DEFAULT true
);

-- ── INVENTORY MOVEMENTS ────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  product_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('entry', 'exit', 'adjustment')),
  amount NUMERIC,
  reason TEXT,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL
);

-- ── APPOINTMENTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Agendado',
  total_price NUMERIC DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- ── APPOINTMENT EXTRAS ─────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_extras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  extra_id UUID REFERENCES service_extras(id) ON DELETE SET NULL,
  price NUMERIC DEFAULT 0
);

-- ── APPOINTMENT PRODUCTS ───────────────────────────
CREATE TABLE IF NOT EXISTS appointment_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  product_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  quantity NUMERIC DEFAULT 1,
  price NUMERIC DEFAULT 0
);

-- ── APPOINTMENT STAFF ──────────────────────────────
CREATE TABLE IF NOT EXISTS appointment_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  commission_earned NUMERIC DEFAULT 0,
  product_commission NUMERIC DEFAULT 0,
  tip_amount NUMERIC DEFAULT 0
);

-- ── TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT,
  amount NUMERIC DEFAULT 0,
  type TEXT CHECK (type IN ('income', 'expense')),
  category TEXT,
  exchange_rate NUMERIC DEFAULT 1,
  currency TEXT DEFAULT 'USD',
  metadata JSONB DEFAULT '{}'
);

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (anon key)
-- (These policies let your app work with the anon key)
CREATE POLICY "Allow all for anon" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON service_extras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON service_checklist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON inventory_movements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointment_extras FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointment_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON appointment_staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- ================================================
-- DONE! Now run _IMPORT_DATA.sql to restore data
-- ================================================
`;
}

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function generateImportSQL(backup) {
  let sql = `-- ================================================
-- ASTRO BARBER CRM — Data Import
-- Generated: ${new Date().toISOString()}
-- ================================================
-- Run this AFTER _SCHEMA.sql
-- ================================================

`;

  // Order matters for foreign keys
  const orderedTables = [
    'clients', 'staff', 'services', 'service_extras',
    'service_checklist_items', 'inventory', 'appointments',
    'appointment_extras', 'appointment_products', 'appointment_staff',
    'inventory_movements', 'transactions'
  ];

  for (const table of orderedTables) {
    const rows = backup[table];
    if (!rows || rows.length === 0) continue;
    
    sql += `\n-- ── ${table.toUpperCase()} (${rows.length} rows) ──────────────\n`;
    
    const columns = Object.keys(rows[0]);
    
    for (const row of rows) {
      const values = columns.map(col => escapeSQL(row[col])).join(', ');
      const cols = columns.map(c => `"${c}"`).join(', ');
      sql += `INSERT INTO "${table}" (${cols}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`;
    }
  }

  sql += '\n-- ================================================\n-- IMPORT COMPLETE!\n-- ================================================\n';
  return sql;
}

main().catch(console.error);
