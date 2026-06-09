const fs = require('fs');
let content = fs.readFileSync('src/services/dataService.js', 'utf-8');

// transactions get
content = content.replace(
    /getTransactions\(\) \{\r?\n\s*const \{ data/g,
    "getTransactions() {\n    const cached = _cacheGet('transactions');\n    if (cached) return cached;\n    const { data"
);

// transactions set
content = content.replace(
    /if \(error\) throw error;\r?\n\s*return data;\r?\n\s*\},\r?\n\s*async getClientTransactions/g,
    "if (error) throw error;\n    _cacheSet('transactions', data, 15000);\n    return data;\n  },\n\n  async getClientTransactions"
);

// add transaction
content = content.replace(
    /addTransaction\(transaction\) \{\r?\n\s*const \{ data/g,
    "addTransaction(transaction) {\n    _cacheInvalidate('transactions');\n    const { data"
);

// inventory movements get
content = content.replace(
    /getInventoryMovements\(\) \{\r?\n\s*const \{ data/g,
    "getInventoryMovements() {\n    const cached = _cacheGet('inventory_movements');\n    if (cached) return cached;\n    const { data"
);

// inventory movements set
content = content.replace(
    /if \(error\) throw error;\r?\n\s*return data;\r?\n\s*\},\r?\n\s*async processPayroll/g,
    "if (error) throw error;\n    _cacheSet('inventory_movements', data, 15000);\n    return data;\n  },\n\n  async processPayroll"
);

// add inventory movement
content = content.replace(
    /recordMovement\(movement\) \{\r?\n\s*const \{ data/g,
    "recordMovement(movement) {\n    _cacheInvalidate('inventory_movements', 'inventory');\n    const { data"
);

fs.writeFileSync('src/services/dataService.js', content);
console.log('Cache fixed!');
