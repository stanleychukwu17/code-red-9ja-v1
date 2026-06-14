import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const goDir = path.join(rootDir, 'seed', 'go');

// ─── Step 1: Parse old Nigerian state IDs ──────────────────────────────────────

async function getOldNigerianIds() {
  const sql = await fs.readFile(path.join(goDir, 'nigerian_states_old_ids.sql'), 'utf-8');
  const states = {}; // { name: oldId }
  
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('(')) continue;
    
    const idMatch = trimmed.match(/^\((\d+),/);
    if (!idMatch) continue;
    const id = Number(idMatch[1]);
    
    const nameMatch = trimmed.match(/^\(\d+,\s*'((?:[^']|'')+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1].replace(/''/g, "'");
    
    states[name] = id;
  }
  return states;
}

// ─── Step 2: Parse new Nigerian state IDs ──────────────────────────────────────

async function getNewStates() {
  const sql = await fs.readFile(path.join(goDir, 'nigerian_states.sql'), 'utf-8');
  const states = {}; // { name: newId }
  
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('(')) continue;
    
    const idMatch = trimmed.match(/^\((\d+),/);
    if (!idMatch) continue;
    const id = Number(idMatch[1]);
    
    const nameMatch = trimmed.match(/^\(\d+,\s*'((?:[^']|'')+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1].replace(/''/g, "'");
    
    states[name] = id;
  }
  return states;
}

// ─── Step 3: Main Reassignment Logic ─────────────────────────────────────────

async function main() {
  const oldNgStates = await getOldNigerianIds();
  const newNgStates = await getNewStates();
  
  // Build Old ID -> New ID mapping for Nigeria
  const ngIdMap = {}; // { oldId: newId }
  for (const [name, oldId] of Object.entries(oldNgStates)) {
    const newId = newNgStates[name];
    if (newId !== undefined) {
      ngIdMap[oldId] = newId;
    }
  }

  // 1. Process 20260418180438_insert_states.sql
  const statesPath = path.join(goDir, '20260418180438_insert_states.sql');
  const statesSql = await fs.readFile(statesPath, 'utf-8');
  const stateLines = statesSql.split('\n');
  const updatedStateLines = [];
  
  let stateTupleCount = 0;
  let ngUpdated = 0;
  let nonNgShifted = 0;
  
  for (let line of stateLines) {
    // Check if it's a state tuple row
    const tupleMatch = line.match(/^(\s*)\((\d+),\s*'((?:[^']|'')+)',\s*(\d+),\s*'([A-Z]{2})',/);
    
    if (tupleMatch) {
      stateTupleCount++;
      const indent = tupleMatch[1];
      const name = tupleMatch[3].replace(/''/g, "'");
      const countryId = Number(tupleMatch[4]);
      const countryCode = tupleMatch[5];
      
      if (countryId === 161 && countryCode === 'NG') {
        // Nigeria: set to new ID (1-37)
        const newId = newNgStates[name];
        if (newId !== undefined) {
          line = line.replace(/^\s*\(\d+,/, `${indent}(${newId},`);
          ngUpdated++;
        } else {
          console.warn(`Warning: New ID not found for Nigerian state "${name}".`);
        }
      } else {
        // Non-Nigeria: check if it is one of the first 37 records originally having IDs 1-37.
        // Wait, how do we identify if it originally had ID 1-37?
        // We know that:
        // - ET (Ethiopia, country_id 70) had original IDs 1..11.
        // - ME (Montenegro, country_id 147) had original IDs 12..33.
        // - NA (Namibia, country_id 152) had original IDs 34..37.
        // Let's identify them by country and name to map them to the original ID, then map to 5458+.
        
        let originalId = null;
        if (countryId === 70) {
          // Ethiopia: we can find its original ID from its position or match.
          // Since we know the order of ET, ME, NA states at the top of the file:
          // ET states:
          const etStates = [
            'Southern Nations, Nationalities, and Peoples', 'Somali', 'Amhara', 'Tigray',
            'Oromia', 'Afar', 'Harari', 'Dire Dawa', 'Benishangul-Gumuz', 'Gambela', 'Addis Ababa'
          ];
          const idx = etStates.indexOf(name);
          if (idx !== -1) originalId = idx + 1;
        } else if (countryId === 147) {
          // Montenegro:
          const meStates = [
            'Petnjica', 'Bar', 'Danilovgrad', 'Rožaje', 'Plužine', 'Nikšić', 'Šavnik', 'Plav',
            'Pljevlja', 'Berane', 'Mojkovac', 'Andrijevica', 'Gusinje', 'Bijelo Polje', 'Kotor',
            'Podgorica', 'Old Royal Capital Cetinje', 'Tivat', 'Budva', 'Kolašin', 'Žabljak', 'Ulcinj'
          ];
          const idx = meStates.indexOf(name);
          if (idx !== -1) originalId = idx + 12;
        } else if (countryId === 152) {
          // Namibia:
          const naStates = ['Kunene', 'Kavango West', 'Kavango East', 'Oshana'];
          const idx = naStates.indexOf(name);
          if (idx !== -1) originalId = idx + 34;
        }
        
        if (originalId !== null) {
          // Shift original ID to continue from 5457 (i.e. 5458 + originalId - 1)
          const newAssignedId = 5458 + originalId - 1;
          line = line.replace(/^\s*\(\d+,/, `${indent}(${newAssignedId},`);
          nonNgShifted++;
        }
      }
    }
    updatedStateLines.push(line);
  }
  
  // Verify state ID uniqueness
  const finalStateIds = new Set();
  const finalStateDuplicates = [];
  for (const line of updatedStateLines) {
    const anyMatch = line.match(/^\s*\((\d+),/);
    if (anyMatch) {
      const id = Number(anyMatch[1]);
      if (finalStateIds.has(id)) {
        finalStateDuplicates.push({ id, line: line.trim() });
      }
      finalStateIds.add(id);
    }
  }

  if (finalStateDuplicates.length > 0) {
    console.error('ERROR: Duplicate IDs found in states file!', finalStateDuplicates);
    return;
  }
  
  await fs.writeFile(statesPath, updatedStateLines.join('\n'), 'utf-8');
  console.log(`Updated states file: ${ngUpdated} Nigerian states set to 1-37. ${nonNgShifted} non-Nigerian states shifted to 5458-5494.`);

  // 2. Process 20260419105714_insert_cities.sql
  const citiesPath = path.join(goDir, '20260419105714_insert_cities.sql');
  const citiesSql = await fs.readFile(citiesPath, 'utf-8');
  const cityLines = citiesSql.split('\n');
  const updatedCityLines = [];
  
  let cityUpdatedCount = 0;
  
  for (let line of cityLines) {
    // Match line: (id, 'name', state_id, country_id, ...
    const match = line.match(/^(\s*\(\d+,\s*'((?:[^']|'')+)',\s*)(\d+)(,\s*)(\d+)(,)/);
    if (match) {
      const prefix = match[1];
      const oldStateId = Number(match[3]);
      const commaSep = match[4];
      const countryId = Number(match[5]);
      const suffix = match[6];
      
      let newStateId = oldStateId;
      let shouldUpdate = false;
      
      if (countryId === 161) {
        // Nigeria: map old state ID (288-323, 4926) to new ID (1-37)
        const mappedId = ngIdMap[oldStateId];
        if (mappedId !== undefined) {
          newStateId = mappedId;
          shouldUpdate = true;
        }
      } else if (countryId === 70 && oldStateId >= 1 && oldStateId <= 11) {
        // Ethiopia: map 1-11 to 5458-5468
        newStateId = 5458 + oldStateId - 1;
        shouldUpdate = true;
      } else if (countryId === 147 && oldStateId >= 12 && oldStateId <= 33) {
        // Montenegro: map 12-33 to 5469-5490
        newStateId = 5458 + oldStateId - 1;
        shouldUpdate = true;
      } else if (countryId === 152 && oldStateId >= 34 && oldStateId <= 37) {
        // Namibia: map 34-37 to 5491-5494
        newStateId = 5458 + oldStateId - 1;
        shouldUpdate = true;
      }
      
      if (shouldUpdate) {
        // Reconstruct the line: prefix + newStateId + commaSep + countryId + suffix
        // Prefix is e.g. "    (38587, 'Addis Ababa', "
        // So we replace the state_id portion.
        const restOfLine = line.slice(prefix.length + match[3].length);
        line = prefix + newStateId + restOfLine;
        cityUpdatedCount++;
      }
    }
    updatedCityLines.push(line);
  }
  
  await fs.writeFile(citiesPath, updatedCityLines.join('\n'), 'utf-8');
  console.log(`Updated cities file: ${cityUpdatedCount} city records updated to reference new state IDs.`);
}

main().catch(console.error);
