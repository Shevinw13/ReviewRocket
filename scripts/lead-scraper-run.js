/**
 * Lead Generation Script — Georgia Batch Run
 * 
 * Finds small trades businesses across Georgia via Google Places API,
 * scrapes websites for emails, and appends to leads-master.xlsx.
 * Deduplicates against existing data by Place ID and email.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');

// ─── Config ────────────────────────────────────────────────────────────────

const envContent = fs.readFileSync('.env', 'utf8');
const apiKeyMatch = envContent.match(/GOOGLE_PLACES_API_KEY=(.+)/);
if (!apiKeyMatch) {
  console.error('ERROR: GOOGLE_PLACES_API_KEY not found in .env');
  process.exit(1);
}
const API_KEY = apiKeyMatch[1].trim();
const MAX_RESULTS = 150; // Search for more candidates to hit 50 email leads
const TARGET_EMAILS = 50;
const EXCEL_PATH = './scripts/leads-master.xlsx';

// Round 2 cities — different from both previous runs AND round 1
const CITIES = [
  'McDonough', 'Stockbridge', 'Griffin', 'Covington', 'Conyers',
  'Snellville', 'Suwanee', 'Buford', 'Flowery Branch', 'Dacula',
  'Loganville', 'Monroe', 'Winder', 'Jefferson', 'Toccoa',
  'Milledgeville', 'Warner Robins', 'Perry', 'Dublin', 'Statesboro',
  'Hinesville', 'Pooler', 'Thomasville', 'Tifton', 'Moultrie',
  'Douglas', 'Waycross', 'Vidalia', 'Cordele', 'Americus',
  'LaGrange', 'Carrollton', 'Villa Rica', 'Dallas', 'Acworth',
  'Powder Springs', 'Douglasville', 'Lithonia', 'Stone Mountain', 'Tucker',
];

const TRADES = [
  'plumber',
  'electrician',
  'HVAC repair',
  'roofer',
  'painter',
  'landscaper',
  'handyman',
  'general contractor',
];

// ─── Load Existing Data for Deduplication ──────────────────────────────────

function loadExistingData() {
  const existing = { placeIds: new Set(), emails: new Set(), lastBatch: 0 };
  
  if (!fs.existsSync(EXCEL_PATH)) {
    return existing;
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  
  for (const sheetName of wb.SheetNames) {
    const match = sheetName.match(/Batch (\d+)/);
    if (match) {
      existing.lastBatch = Math.max(existing.lastBatch, parseInt(match[1]));
    }
    
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws);
    
    for (const row of data) {
      if (row['Email']) {
        existing.emails.add(row['Email'].toLowerCase().trim());
      }
      // We don't store Place ID in the Excel, so we'll track by business name + address
      if (row['Business Name'] && row['Address']) {
        existing.placeIds.add(`${row['Business Name']}|||${row['Address']}`);
      }
    }
  }

  console.log(`📂 Loaded existing data: ${existing.emails.size} emails, last batch: ${existing.lastBatch}`);
  return existing;
}

// ─── Google Places API ─────────────────────────────────────────────────────

async function searchPlaces(query) {
  const url = 'https://places.googleapis.com/v1/places:searchText';
  const body = JSON.stringify({
    textQuery: query,
    maxResultCount: 20,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri',
    },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`  ✗ Search failed for "${query}":`, err.slice(0, 120));
    return [];
  }

  const data = await response.json();
  return data.places || [];
}

// ─── Website Email Scraper ─────────────────────────────────────────────────

function fetchPage(url, timeout = 8000) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return fetchPage(redirectUrl, timeout).then(resolve);
        }
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > 500000) { res.destroy(); resolve(data); }
        });
        res.on('end', () => resolve(data));
        res.on('error', () => resolve(''));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch {
      resolve('');
    }
  });
}

function extractEmails(html) {
  if (!html) return [];
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = html.match(emailRegex) || [];
  
  return [...new Set(matches.filter((email) => {
    const lower = email.toLowerCase();
    return !lower.includes('example.com') &&
           !lower.includes('sentry') &&
           !lower.includes('schema.org') &&
           !lower.includes('.png') &&
           !lower.includes('.jpg') &&
           !lower.includes('.svg') &&
           !lower.includes('.webp') &&
           !lower.includes('wixpress') &&
           !lower.includes('googleapis') &&
           !lower.includes('wordpress') &&
           !lower.includes('gravatar') &&
           !lower.includes('@2x') &&
           !lower.includes('company@email') &&
           !lower.includes('email@') &&
           !lower.includes('your@') &&
           !lower.includes('name@') &&
           !lower.includes('user@') &&
           lower.length < 60;
  }))];
}

function extractMailtoEmails(html) {
  if (!html) return [];
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
  const emails = [];
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    emails.push(match[1]);
  }
  return [...new Set(emails)];
}

async function scrapeEmailFromWebsite(websiteUrl) {
  if (!websiteUrl) return null;

  const baseUrl = websiteUrl.split('?')[0].replace(/\/$/, '');
  const pagesToTry = [
    websiteUrl,
    baseUrl + '/contact',
    baseUrl + '/contact-us',
    baseUrl + '/about',
    baseUrl + '/about-us',
  ];

  for (const pageUrl of pagesToTry) {
    try {
      const html = await fetchPage(pageUrl);
      
      // Check mailto links first (most reliable)
      const mailtoEmails = extractMailtoEmails(html);
      if (mailtoEmails.length > 0) return mailtoEmails[0];
      
      // Then regex
      const regexEmails = extractEmails(html);
      if (regexEmails.length > 0) return regexEmails[0];

      // Small delay between page fetches
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      continue;
    }
  }

  return null;
}

// ─── Excel Writing ─────────────────────────────────────────────────────────

function writeToExcel(leads, lastBatch) {
  let wb;
  
  if (fs.existsSync(EXCEL_PATH)) {
    wb = XLSX.readFile(EXCEL_PATH);
  } else {
    wb = XLSX.utils.book_new();
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Split leads into batches of 25
  for (let i = 0; i < leads.length; i += 25) {
    const batch = leads.slice(i, i + 25);
    const batchNum = lastBatch + Math.floor(i / 25) + 1;
    const sheetName = `Batch ${batchNum}`;
    
    const rows = batch.map(b => ({
      'Business Name': b.name,
      'Email': b.email,
      'Stars': b.rating,
      'Reviews': b.reviewCount,
      'Phone': b.phone,
      'Website': b.website,
      'Google Maps URL': b.googleMapsUrl,
      'Address': b.address,
      'Date Found': today,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 35 }, // Business Name
      { wch: 30 }, // Email
      { wch: 6 },  // Stars
      { wch: 8 },  // Reviews
      { wch: 16 }, // Phone
      { wch: 40 }, // Website
      { wch: 50 }, // Google Maps URL
      { wch: 50 }, // Address
      { wch: 12 }, // Date Found
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    console.log(`  📝 Created sheet "${sheetName}" with ${batch.length} leads`);
  }

  XLSX.writeFile(wb, EXCEL_PATH);
  console.log(`\n💾 Saved to: ${EXCEL_PATH}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Finding trades businesses across Georgia (fresh cities)...');
  console.log(`   Target: ${MAX_RESULTS} NEW businesses with 10-150 reviews\n`);

  // Load existing data for deduplication
  const existing = loadExistingData();
  
  const allBusinesses = new Map();
  let searchCount = 0;
  let duplicatesSkipped = 0;

  // Search each trade in each city
  for (const trade of TRADES) {
    if (allBusinesses.size >= MAX_RESULTS) break;

    for (const city of CITIES) {
      if (allBusinesses.size >= MAX_RESULTS) break;

      const query = `${trade} in ${city}, Georgia`;
      searchCount++;
      process.stdout.write(`  [${searchCount}] "${trade}" in ${city} — ${allBusinesses.size} found, ${duplicatesSkipped} dupes skipped\r`);

      const places = await searchPlaces(query);

      for (const place of places) {
        if (allBusinesses.size >= MAX_RESULTS) break;

        const reviewCount = place.userRatingCount || 0;
        
        // Filter: 10-150 reviews (small, established businesses)
        if (reviewCount < 10 || reviewCount > 150) continue;

        // Skip if we already have this place
        if (allBusinesses.has(place.id)) continue;

        // Check against existing data (by name+address combo)
        const nameAddrKey = `${place.displayName?.text || ''}|||${place.formattedAddress || ''}`;
        if (existing.placeIds.has(nameAddrKey)) {
          duplicatesSkipped++;
          continue;
        }

        allBusinesses.set(place.id, {
          id: place.id,
          name: place.displayName?.text || '',
          address: place.formattedAddress || '',
          rating: place.rating || 0,
          reviewCount,
          phone: place.nationalPhoneNumber || '',
          website: place.websiteUri || '',
          googleMapsUrl: place.googleMapsUri || '',
          email: null,
        });
      }

      // Rate limit: 200ms between searches
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const businesses = Array.from(allBusinesses.values());
  console.log(`\n\n✅ Found ${businesses.length} candidate businesses (${searchCount} API searches, ${duplicatesSkipped} duplicates skipped)`);
  
  const withWebsite = businesses.filter((b) => b.website).length;
  console.log(`   ${withWebsite} have websites to scrape\n`);
  console.log('📧 Scraping websites for emails...\n');

  // Scrape emails
  let emailsFound = 0;
  let scraped = 0;
  const leadsWithEmail = [];

  for (const biz of businesses) {
    if (!biz.website) continue;
    
    scraped++;
    process.stdout.write(`  Scraping ${scraped}/${withWebsite}... (${emailsFound} emails found so far)\r`);
    
    const email = await scrapeEmailFromWebsite(biz.website);
    
    if (email) {
      // Check email dedup against existing
      if (existing.emails.has(email.toLowerCase().trim())) {
        duplicatesSkipped++;
        continue;
      }
      
      biz.email = email;
      leadsWithEmail.push(biz);
      emailsFound++;
      
      // Also add to existing set so we don't duplicate within this run
      existing.emails.add(email.toLowerCase().trim());
    }
    
    // Rate limit
    await new Promise((r) => setTimeout(r, 200));
    
    // Stop if we have enough leads with emails
    if (leadsWithEmail.length >= TARGET_EMAILS) break;
  }

  console.log(`\n\n📊 Final Results:`);
  console.log(`   ${searchCount} API searches performed`);
  console.log(`   ${businesses.length} businesses found (matching criteria)`);
  console.log(`   ${duplicatesSkipped} duplicates skipped`);
  console.log(`   ${scraped} websites scraped`);
  console.log(`   ${emailsFound} emails found`);
  if (scraped > 0) {
    console.log(`   ${Math.round(emailsFound / scraped * 100)}% email success rate`);
  }

  if (leadsWithEmail.length === 0) {
    console.log('\n⚠️  No new leads with emails found. Try different cities or trades.');
    return;
  }

  // Write to Excel
  console.log(`\n📁 Writing ${leadsWithEmail.length} leads to Excel...\n`);
  writeToExcel(leadsWithEmail, existing.lastBatch);
  
  console.log(`\n🎉 Done! Added ${leadsWithEmail.length} new leads to ${EXCEL_PATH}`);
}

main().catch(console.error);
