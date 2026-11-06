const fs = require('node:fs');
const path = require('node:path');

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
let validUrl = false;
try {
  const url = new URL(supabaseUrl);
  validUrl = url.protocol === 'https:' && !url.username && !url.password
    && !url.search && !url.hash;
} catch {}
if (!validUrl || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(supabasePublishableKey)) {
  throw new Error('Set SUPABASE_URL (HTTPS) and SUPABASE_PUBLISHABLE_KEY (publishable key only)');
}
const config = JSON.stringify({supabaseUrl, supabasePublishableKey}).replace(/</g, '\\u003c');
fs.writeFileSync(path.join(__dirname, '..', 'supabase-config.local.js'),
  'window.NEWSLESSON_PUBLIC_CONFIG = ' + config + ';\n');
