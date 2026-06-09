const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const { createClient } = require('@supabase/supabase-js');

// Configuración Supabase
const supabaseUrl = 'https://xptbgtjpakrbnpkohmpm.supabase.co';
// Usar el Service Role Key para evitar cualquier problema de RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwdGJndGpwYWtyYm5wa29obXBtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTAxMTU4NSwiZXhwIjoyMDk2NTg3NTg1fQ.PAojjIOZP-ehSDc31WNatjubi1tL_kjZL9wNzIFjBDY';
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_DIR = 'C:\\Users\\Waiha\\Downloads';

// Orden estricto para no romper llaves foráneas (Foreign Keys)
const tablesToImport = [
    { table: 'transactions', file: 'transactions_rows.csv' },
];

async function importData() {
    console.log('🚀 Iniciando migración de datos...');

    for (const item of tablesToImport) {
        const filePath = path.join(BASE_DIR, item.file);
        
        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Archivo no encontrado: ${filePath}, saltando...`);
            continue;
        }

        console.log(`\n⏳ Procesando ${item.table}...`);
        const csvText = fs.readFileSync(filePath, 'utf-8');

        // Parse CSV
        const parsed = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true, // Convierte números automáticamente
            transformHeader: h => h.trim(),
        });

        let dataToInsert = parsed.data;

        // Clean up empty objects or nulls
        dataToInsert = dataToInsert.map(row => {
            const cleanRow = {};
            for (let [key, value] of Object.entries(row)) {
                if (value === '' || value === 'NULL' || value === null) {
                    cleanRow[key] = null;
                } else if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
                    try {
                        cleanRow[key] = JSON.parse(value);
                    } catch (e) {
                        cleanRow[key] = value;
                    }
                } else if (typeof value === 'string' && value.toLowerCase() === 'true') {
                    cleanRow[key] = true;
                } else if (typeof value === 'string' && value.toLowerCase() === 'false') {
                    cleanRow[key] = false;
                } else {
                    cleanRow[key] = value;
                }
            }
            return cleanRow;
        });

        if (dataToInsert.length === 0) {
            console.log(`ℹ️ La tabla ${item.table} está vacía en el CSV.`);
            continue;
        }

        // Insert in batches of 500 to avoid request too large errors
        const BATCH_SIZE = 500;
        for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
            const batch = dataToInsert.slice(i, i + BATCH_SIZE);
            const { error } = await supabase.from(item.table).insert(batch);
            
            if (error) {
                console.error(`❌ Error insertando en ${item.table} (Lote ${i} - ${i + BATCH_SIZE}):`, error.message);
                console.error(error.details, error.hint);
            } else {
                console.log(`✅ Insertados ${batch.length} registros en ${item.table}.`);
            }
        }
    }

    console.log('\n🎉 ¡Migración completamente terminada!');
}

importData();
