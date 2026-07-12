const XLSX = require('xlsx');
const fs = require('fs');

// Read the CSV with emails
const csvData = fs.readFileSync('./scripts/leads-georgia-with-email.csv', 'utf8');
const lines = csvData.split('\n');

// Parse rows
const rows = [];
const seenEmails = new Set();

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const matches = lines[i].match(/"([^"]*)"/g);
  if (!matches) continue;
  const fields = matches.map(f => f.replace(/^"|"$/g, ''));
  
  const email = fields[1];
  // Skip if no email or duplicate email
  if (!email || seenEmails.has(email.toLowerCase())) continue;
  seenEmails.add(email.toLowerCase());
  
  rows.push({
    'Business Name': fields[0],
    'Email': fields[1],
    'Stars': fields[2],
    'Reviews': fields[3],
    'Phone': fields[4],
    'Website': fields[5],
    'Google Maps URL': fields[6],
    'Address': fields[7],
    'Date Found': new Date().toISOString().split('T')[0],
  });
}

console.log('Total unique businesses with email:', rows.length);

// Create workbook with tabs of 25
const wb = XLSX.utils.book_new();
const batchSize = 25;
let batchNum = 1;

for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const ws = XLSX.utils.json_to_sheet(batch);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Business Name
    { wch: 35 }, // Email
    { wch: 6 },  // Stars
    { wch: 8 },  // Reviews
    { wch: 16 }, // Phone
    { wch: 40 }, // Website
    { wch: 50 }, // Google Maps URL
    { wch: 45 }, // Address
    { wch: 12 }, // Date Found
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Batch ' + batchNum);
  console.log('  Batch ' + batchNum + ': ' + batch.length + ' leads');
  batchNum++;
}

XLSX.writeFile(wb, './scripts/leads-master.xlsx');
console.log('\nSaved to: scripts/leads-master.xlsx');
