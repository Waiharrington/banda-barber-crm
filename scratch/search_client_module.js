import fs from 'fs';

const content = fs.readFileSync('src/components/ClientModule.jsx', 'utf8');
const lines = content.split('\n');

console.log("Searching for photoMeta usage...");
lines.forEach((line, index) => {
  if (line.includes('photoMeta') || line.includes('setPhotoMeta')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
