import fs from 'fs';

const content = fs.readFileSync('src/components/ReportsModule.jsx', 'utf8');
const lines = content.split('\n');

console.log("Searching ReportsModule for mock/chart data...");
lines.forEach((line, index) => {
  if (line.includes('287') || line.includes('330') || line.includes('193') || line.includes('76')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
