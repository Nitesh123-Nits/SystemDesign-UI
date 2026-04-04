const fs = require('fs');
const https = require('https');
const http = require('http');

const data = fs.readFileSync('c:\\Users\\nites\\Downloads\\SystemDesign UI\\data.js', 'utf8');

// Use a simple regex to extract all URLs 
// Since they are defined in strings like url: "https://..."
const urlRegex = /url:\s*"(https?:\/\/[^"]+)"/g;
let match;
const urls = [];
while ((match = urlRegex.exec(data)) !== null) {
  urls.push(match[1]);
}

console.log(`Found ${urls.length} URLs to check.`);

async function checkUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ url, status: 'OK', code: res.statusCode });
      } else {
        resolve({ url, status: 'BROKEN', code: res.statusCode });
      }
    });

    req.on('error', (err) => {
      resolve({ url, status: 'ERROR', code: err.message });
    });
    
    // timeout after 5s
    req.setTimeout(5000, () => {
      req.abort();
      resolve({ url, status: 'TIMEOUT' });
    });
  });
}

async function run() {
  const broken = [];
  for (const url of urls) {
    const res = await checkUrl(url);
    if (res.status !== 'OK') {
      broken.push(res);
      console.log(`[❌] ${res.status}: ${res.code} - ${url}`);
    } else {
      console.log(`[✅] ${res.status} - ${url}`);
    }
  }
  console.log(`\nScan complete. ${broken.length} broken links found.`);
}

run();
