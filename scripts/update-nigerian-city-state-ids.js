import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Precise mapping: old Nigerian state ID → new Nigerian state ID
// Source: nigerian_states_old_ids.sql → 20260418180438_insert_states.sql (L282-L318)
const OLD_TO_NEW = {
  288: 17,  // Jigawa
  289: 14,  // Enugu
  290: 21,  // Kebbi
  291: 7,   // Benue
  292: 33,  // Sokoto
  293: 37,  // Abuja FCT
  294: 18,  // Kaduna
  295: 23,  // Kwara
  296: 30,  // Oyo
  297: 35,  // Yobe
  298: 22,  // Kogi
  299: 36,  // Zamfara
  300: 19,  // Kano
  301: 25,  // Nasarawa
  302: 31,  // Plateau
  303: 1,   // Abia
  304: 3,   // Akwa Ibom
  305: 6,   // Bayelsa
  306: 24,  // Lagos
  307: 8,   // Borno
  308: 16,  // Imo
  309: 13,  // Ekiti
  310: 15,  // Gombe
  311: 11,  // Ebonyi
  312: 5,   // Bauchi
  313: 20,  // Katsina
  314: 9,   // Cross River
  315: 4,   // Anambra
  316: 10,  // Delta
  317: 26,  // Niger
  318: 12,  // Edo
  319: 34,  // Taraba
  320: 2,   // Adamawa
  321: 28,  // Ondo
  322: 29,  // Osun
  323: 27,  // Ogun
  4926: 32, // Rivers
};

// Nigeria's country_id in the DB
const NIGERIA_COUNTRY_ID = 161;

// Build a set of all old IDs for fast lookup
const OLD_STATE_IDS = new Set(Object.keys(OLD_TO_NEW).map(Number));

/**
 * Parse a city INSERT row like:
 *   (157479, 'Dutse-Jigawa', 288, 161, 11.7592, 9.3389, 1),
 *
 * The format is: (city_id, 'city_name', state_id, country_id, lat, lng[, is_capital])
 *
 * We use a regex that:
 *   1. Matches the opening paren + city_id
 *   2. Matches the city name (single-quoted, with possible '' escapes)
 *   3. Captures state_id and country_id as integers
 *   4. Keeps the rest of the line intact
 *
 * Returns null if the line doesn't match a city tuple.
 */
function parseCityLine(line) {
  // Match: optional-whitespace ( integer , 'name' , state_id , country_id , ...rest
  // We allow '' inside the name.
  const m = line.match(
    /^(\s*\(\d+,\s*'(?:[^']|'')*',\s*)(\d+)(,\s*)(\d+)(,[\s\S]*)$/
  );
  if (!m) return null;
  return {
    prefix: m[1],       // everything up to and including the comma after city name + space
    stateId: Number(m[2]),
    sep: m[3],          // ", " between state_id and country_id
    countryId: Number(m[4]),
    suffix: m[5],       // everything after country_id (comma, lat, lng, etc.)
  };
}

async function main() {
  const citiesPath = path.join(rootDir, 'seed', 'go', '20260419105714_insert_cities.sql');

  console.log('Reading cities file...');
  const content = await fs.readFile(citiesPath, 'utf-8');
  const lines = content.split('\n');

  console.log(`Total lines: ${lines.length.toLocaleString()}`);

  let updatedCount = 0;
  let skippedOldIdNotInMapCount = 0;
  const updatedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parsed = parseCityLine(line);

    if (parsed === null) {
      // Not a city tuple line – keep as-is
      updatedLines.push(line);
      continue;
    }

    const { prefix, stateId, sep, countryId, suffix } = parsed;

    // Only touch rows where country_id === 161 (Nigeria)
    if (countryId !== NIGERIA_COUNTRY_ID) {
      updatedLines.push(line);
      continue;
    }

    // Country is Nigeria – check if state_id is one of the old ones
    if (!OLD_STATE_IDS.has(stateId)) {
      // It's a Nigerian city but the state_id is NOT an old ID.
      // This could mean it was already updated, or it references a state_id
      // outside the old range. Log a warning so we can inspect.
      if (stateId >= 1 && stateId <= 37) {
        // Already on new IDs – skip silently
      } else {
        console.warn(
          `  ⚠ Line ${i + 1}: Nigerian city with unexpected state_id=${stateId} (not in old map and not 1-37). Left unchanged.`
        );
        skippedOldIdNotInMapCount++;
      }
      updatedLines.push(line);
      continue;
    }

    // Replace old state_id with new state_id
    const newStateId = OLD_TO_NEW[stateId];
    const newLine = prefix + newStateId + sep + countryId + suffix;
    updatedLines.push(newLine);
    updatedCount++;
  }

  console.log(`\nDone scanning.`);
  console.log(`  ✓ Updated: ${updatedCount} Nigerian city rows`);
  if (skippedOldIdNotInMapCount > 0) {
    console.warn(`  ⚠ Skipped (unexpected state_id): ${skippedOldIdNotInMapCount} rows`);
  }

  if (updatedCount === 0) {
    console.log('\nNo rows were changed. The file may already be up to date.');
    return;
  }

  console.log('\nWriting updated file...');
  await fs.writeFile(citiesPath, updatedLines.join('\n'), 'utf-8');
  console.log('✓ File written successfully.');

  // Quick verification: scan the result for any remaining old Nigerian state IDs
  console.log('\nVerifying no old IDs remain...');
  let remainingOld = 0;
  for (const line of updatedLines) {
    const p = parseCityLine(line);
    if (!p) continue;
    if (p.countryId === NIGERIA_COUNTRY_ID && OLD_STATE_IDS.has(p.stateId)) {
      console.error(`  ✗ Still found old state_id=${p.stateId} in: ${line.trim()}`);
      remainingOld++;
    }
  }
  if (remainingOld === 0) {
    console.log('  ✓ No old Nigerian state IDs remain in the file.');
  } else {
    console.error(`  ✗ ${remainingOld} row(s) still have old state IDs!`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
