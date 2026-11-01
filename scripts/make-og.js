/**
 * Renders scripts/og/og.html to public/og.png (the link-preview image) with a
 * headless Chrome or Edge. Run with: node scripts/make-og.js
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const browser = BROWSERS.find((b) => fs.existsSync(b));
if (!browser) throw new Error('No Chrome or Edge found.');

const src = pathToFileURL(path.join(__dirname, 'og', 'og.html')).href;
const out = path.join(__dirname, '..', 'public', 'og.png');
execFileSync(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  '--virtual-time-budget=3000',
  '--window-size=1200,630',
  `--screenshot=${out}`,
  src,
]);
console.log(`Wrote ${out}`);
