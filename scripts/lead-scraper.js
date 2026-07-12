/**
 * Lead Generation Script — Full Georgia Scrape
 * 
 * Finds small trades businesses across Georgia via Google Places API,
 * scrapes their websites for email addresses.
 * Outputs results to a CSV file.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

const API_KEY = 'AIzaSyDmXv6PhADtEDQaRYEmKU2AUTVeClEzfuY';
const MAX_RESULTS = 200;

// Georgia cities to search
const CITIES = [
  'Atlanta', 'Savannah', 'Augusta', 'Marietta', 'Athens',
  'Macon', 'Roswell', 'Alpharetta', 'Johns Creek', 'Kennesaw',
  'Lawrenceville', 'Duluth', 'Decatur', 'Cumming', 'Woodstock',
  'Brunswick', 'Valdosta', 'Columbus', 'Sandy Springs', 'Brookhaven',
];

// Business types
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
    console.error(`  ✗ Search failed for "${query}":`, err.slice(0, 100));
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
      const req = client.get(url, { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return fetchPage(redirectUrl, timeout).then(resolve);
        }
        
        let data = '';
        res.on('data', (chunk) => { 
          data += chunk;
          // Cap at 500KB to avoid huge pages
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
  
  const filtered = matches.filter((email) => {
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
  });

  return [...new Set(filtered)];
}

// Also look for mailto: links which are more reliable
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

  // Clean up URL
  const baseUrl = websiteUrl.split('?')[0].replace(/\/$/, '');

  try {
    // Try homepage
    let html = await fetchPage(websiteUrl);
    
    // Check mailto links first (most reliable)
    let emails = extractMailtoEmails(html);
    if (emails.length > 0) return emails[0];
    
    // Then regex
    emails = extractEmails(html);
    if (emails.length > 0) return emails[0];

    // Try /contact
    html = await fetchPage(baseUrl + '/contact');
    emails = extractMailtoEmails(html);
    if (emails.length > 0) return emails[0];
    emails = extractEmails(html);
    if (emails.length > 0) return emails[0];

    // Try /contact-us
    html = await fetchPage(baseUrl + '/contact-us');
    emails = extractMailtoEmails(html);
    if (emails.length > 0) return emails[0];
    emails = extractEmails(html);
    if (emails.length > 0) return emails[0];

    // Try /about
    html = await fetchPage(baseUrl + '/about');
    emails = extractMailtoEmails(html);
    if (emails.length > 0) return emails[0];
    emails = extractEmails(html);
    if (emails.length > 0) return emails[0];

    // Try /about-us
    html = await fetchPage(baseUrl + '/about-us');
    emails = extractMailtoEmails(html);
    if (emails.length > 0) return emails[0];
    emails = extractEmails(html);
    if (emails.length > 0) return emails[0];

    return null;
  } catch {
    return null;
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔍 Finding trades businesses across Georgia...');
  console.log(`   Target: ${MAX_RESULTS} businesses with 10-150 reviews\n`);

  const allBusinesses = new Map(); // Use map to deduplicate by place ID
  let searchCount = 0;

  // Search each trade in each city
  for (const trade of TRADES) {
    if (allBusinesses.size >= MAX_RESULTS) break;

    for (const city of CITIES) {
      if (allBusinesses.size >= MAX_RESULTS) break;

      const query = `${trade} in ${city}, Georgia`;
      searchCount++;
      process.stdout.write(`  [${searchCount}] Searching: "${trade}" in ${city} (${allBusinesses.size} found so far)\r`);

      const places = await searchPlaces(query);

      for (const place of places) {
        if (allBusinesses.size >= MAX_RESULTS) break;

        const reviewCount = place.userRatingCount || 0;
        
        // Filter: 10-150 reviews
        if (reviewCount < 10 || reviewCount > 150) continue;

        // Skip duplicates
        if (allBusinesses.has(place.id)) continue;

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
  console.log(`\n\n✅ Found ${businesses.length} businesses with 10-150 reviews (${searchCount} API searches)`);
  
  const withWebsite = businesses.filter((b) => b.website).length;
  console.log(`   ${withWebsite} have websites to scrape\n`);
  console.log('📧 Scraping websites for emails...\n');

  // Scrape emails (with progress)
  let emailsFound = 0;
  let scraped = 0;
  for (const biz of businesses) {
    if (biz.website) {
      scraped++;
      process.stdout.write(`  Scraping ${scraped}/${withWebsite}... (${emailsFound} emails found)\r`);
      biz.email = await scrapeEmailFromWebsite(biz.website);
      if (biz.email) {
        emailsFound++;
      }
      // Rate limit
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`\n\n📊 Final Results:`);
  console.log(`   ${businesses.length} businesses total`);
  console.log(`   ${emailsFound} emails found (${Math.round(emailsFound/withWebsite*100)}% of those with websites)`);

  // Write CSV
  const csvHeader = 'Business Name,Email,Stars,Reviews,Phone,Website,Google Maps URL,Address';
  const csvRows = businesses.map((b) =>
    `"${(b.name || '').replace(/"/g, '""')}","${b.email || ''}","${b.rating}","${b.reviewCount}","${b.phone}","${b.website}","${b.googleMapsUrl}","${(b.address || '').replace(/"/g, '""')}"`
  );
  const csv = [csvHeader, ...csvRows].join('\n');

  const outputPath = './scripts/leads-georgia.csv';
  fs.writeFileSync(outputPath, csv);
  console.log(`\n💾 Saved to: ${outputPath}`);

  // Also save just the ones with emails
  const withEmails = businesses.filter((b) => b.email);
  const csvEmailOnly = [csvHeader, ...withEmails.map((b) =>
    `"${(b.name || '').replace(/"/g, '""')}","${b.email || ''}","${b.rating}","${b.reviewCount}","${b.phone}","${b.website}","${b.googleMapsUrl}","${(b.address || '').replace(/"/g, '""')}"`
  )].join('\n');
  
  const emailOutputPath = './scripts/leads-georgia-with-email.csv';
  fs.writeFileSync(emailOutputPath, csvEmailOnly);
  console.log(`💾 Emails only: ${emailOutputPath} (${withEmails.length} businesses)`);
}

main().catch(console.error);
