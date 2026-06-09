const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceModule.jsx', 'utf-8');

// Ensure useMemo is imported
if (!content.includes('useMemo')) {
    content = content.replace(/import React, \{([^}]+)\} from 'react';/, "import React, { $1, useMemo } from 'react';");
}

// 1. filteredTransactions
content = content.replace(
    /const filteredTransactions = transactions\.filter\(/,
    "const filteredTransactions = useMemo(() => transactions.filter("
);
content = content.replace(
    /        return matchesSearch;\r?\n      \}\);\r?\n\r?\n      const uniqueServices =/s,
    "        return matchesSearch;\n      }), [transactions, filterType, filterBarber, filterMethod, filterStartDate, filterEndDate, filterSearch]);\n\n      const uniqueServices ="
);

// 2. uniqueServices
content = content.replace(
    /const uniqueServices = Array\.from\(new Set\(transactions\.map\(t => parseTxExcel\(t\)\.serviceName\)\.filter\(Boolean\)\)\);/,
    "const uniqueServices = useMemo(() => Array.from(new Set(transactions.map(t => parseTxExcel(t).serviceName).filter(Boolean))), [transactions]);"
);

// 3. weeklyTransactions
content = content.replace(
    /const weeklyTransactions = transactions\.filter\(/,
    "const weeklyTransactions = useMemo(() => transactions.filter("
);
content = content.replace(
    /        return d >= wStart && d <= wEnd;\r?\n      \}\);\r?\n\r?\n      const processedPayroll =/s,
    "        return d >= wStart && d <= wEnd;\n      }), [transactions, weekStart, weekEnd]);\n\n      const processedPayroll ="
);

// 4. processedPayroll
content = content.replace(
    /const processedPayroll = staff\.map\(/,
    "const processedPayroll = useMemo(() => staff.map("
);
content = content.replace(
    /          \}\r?\n        \}\);\r?\n\r?\n        \/\/ Totales de nómina/s,
    "          }\n        }), [staff, weeklyTransactions]);\n\n        // Totales de nómina"
);

fs.writeFileSync('src/components/FinanceModule.jsx', content);
console.log('FinanceModule optimized with useMemo!');
