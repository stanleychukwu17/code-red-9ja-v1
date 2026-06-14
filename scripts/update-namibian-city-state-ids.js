import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Map old Namibian state ID to new Namibian state ID
const OLD_TO_NEW = {
  38: 5495,  // Hardap
  39: 5496,  // Omusati
  40: 5497,  // Ohangwena
  41: 5498,  // Omaheke
  42: 5499,  // Oshikoto
  43: 5500,  // Erongo
  44: 5501,  // Khomas
  45: 5502,  // Karas
  46: 5503,  // Otjozondjupa
  47: 5504   // Zambezi
};

const NAMIBIA_COUNTRY_ID = 152;
const OLD_STATE_IDS = new Set(Object.keys(OLD_TO_NEW).map(Number));

function parseCityLine(line) {
  const m = line.match(/^(\s*\(\d+,\s*'(?:[^']|'')*',\s*)(\d+)(,\s*)(\d+)(,[\s\S]*)$/);
  if (!m) return null;
  return {
    prefix: m[1],
    stateId: Number(m[2]),
    sep: m[3],
    countryId: Number(m[4]),
    suffix: m[5],
  };
}

async function main() {
  const citiesPath = path.join(rootDir, 'seed', 'go', '20260419105714_insert_cities.sql');

  console.log('Reading cities file...');
  const content = await fs.readFile(citiesPath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Total lines: ${lines.length.toLocaleString()}`);

  let updatedCount = 0;
  const updatedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseCityLine(line);

    if (parsed === null) {
      updatedLines.push(line);
      continue;
    }

    const { prefix, stateId, sep, countryId, suffix } = parsed;

    if (countryId !== NAMIBIA_COUNTRY_ID) {
      updatedLines.push(line);
      continue;
    }

    if (!OLD_STATE_IDS.has(stateId)) {
      updatedLines.push(line);
      continue;
    }

    const newStateId = OLD_TO_NEW[stateId];
    const newLine = prefix + newStateId + sep + countryId + suffix;
    updatedLines.push(newLine);
    updatedCount++;
  }

  console.log(`\n✓ Updated: ${updatedCount} Namibian city rows`);

  if (updatedCount === 0) {
    console.log('\nNo rows were changed.');
    return;
  }

  console.log('\nWriting updated file...');
  await fs.writeFile(citiesPath, updatedLines.join('\n'), 'utf-8');
  console.log('✓ File written successfully.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
