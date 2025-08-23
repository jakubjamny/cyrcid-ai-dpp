/**
 * Basic repo sanity checks for starter.
 * - Ensures required folders exist
 * - Parses selected JSON files
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredDirs = [
  'apps/web',
  'apps/api',
  'packages/schema',
  'packages/ai-pipeline',
  'packages/widget',
  'knowledge/packs',
  'golden/inputs',
  'golden/expected',
  'exporters/pdf',
  'exporters/jsonld',
  'exporters/qr',
  'docs'
];

let ok = true;
function err(m){ console.error('✗ ' + m); ok=false; }
function info(m){ console.log('✓ ' + m); }

// Check dirs
for (const d of requiredDirs) {
  if (!fs.existsSync(path.join(root, d))) err(`Chybí složka: ${d}`);
  else info(`OK složka: ${d}`);
}

// Parse JSON files if exist
const jsonFiles = [
  'packages/schema/dpp.schema.json',
  'knowledge/registry.json'
];
for (const f of jsonFiles) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    try {
      JSON.parse(fs.readFileSync(p, 'utf8'));
      info(`Validní JSON: ${f}`);
    } catch(e) {
      err(`Nevalidní JSON: ${f} — ${e.message}`);
    }
  } else {
    info(`Soubor neexistuje (zatím OK): ${f}`);
  }
}

// Check governance exists and non-empty
const govPath = path.join(root, 'docs/GOVERNANCE.md');
try {
  const size = fs.statSync(govPath).size;
  if (size > 20) info('GOVERNANCE.md existuje a má obsah');
  else err('GOVERNANCE.md je prázdný');
} catch {
  err('Chybí docs/GOVERNANCE.md');
}

if (!ok) process.exit(1);
console.log('Vše v pořádku ✅');