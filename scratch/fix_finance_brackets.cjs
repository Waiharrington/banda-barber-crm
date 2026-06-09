const fs = require('fs');

let content = fs.readFileSync('src/components/FinanceModule.jsx', 'utf-8');

// Fix 1: filteredTransactions
content = content.replace(
    /return true;\r?\n  \}\);/g,
    "return true;\n  }), [transactions, filterType, filterService, searchQuery, filterBarber, filterDate, startDate, endDate]);"
);

// Fix 2: weeklyTransactions
content = content.replace(
    /        return d >= wStart && d <= wEnd;\r?\n      \}\);/g,
    "        return d >= wStart && d <= wEnd;\n      }), [transactions, weekStart, weekEnd]);"
);

// Fix 3: processedPayroll
content = content.replace(
    /          \}\r?\n        \}\);/g,
    "          }\n        }), [staff, weeklyTransactions]);"
);

fs.writeFileSync('src/components/FinanceModule.jsx', content);
console.log('FinanceModule brackets fixed!');
