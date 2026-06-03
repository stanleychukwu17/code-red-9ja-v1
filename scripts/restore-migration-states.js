import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const goDir = path.join(rootDir, 'seed', 'go');

// ─── Step 1: Parse old state IDs ──────────────────────────────────────────────

async function getOldStates() {
  const sql = await fs.readFile(path.join(goDir, 'nigerian_states_old_ids.sql'), 'utf-8');
  const states = {}; // { name: id }
  
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

// ─── Step 2: Process the migration file ──────────────────────────────────────

async function main() {
  const oldStates = await getOldStates();
  
  const migrationFilePath = path.join(goDir, '20260418180438_insert_states.sql');
  const sql = await fs.readFile(migrationFilePath, 'utf-8');
  const lines = sql.split('\n');
  const updatedLines = [];
  let updatedCount = 0;
  
  const allIds = new Set();
  const duplicates = [];

  for (let line of lines) {
    // Match line: (id, 'name', 161, 'NG', ...
    const match = line.match(/^(\s*)\((\d+),\s*'((?:[^']|'')+)',\s*161,\s*'NG',/);
    if (match) {
      const indent = match[1];
      const name = match[3].replace(/''/g, "'");
      
      const oldId = oldStates[name];
      if (oldId !== undefined) {
        // Replace the current ID with the old ID
        line = line.replace(/^\s*\(\d+,/, `${indent}(${oldId},`);
        updatedCount++;
        allIds.add(oldId);
      } else {
        console.warn(`Warning: Found Nigerian state row in migration file ("${name}") but no old ID mapping exists.`);
      }
    } else {
      // For non-Nigerian states, collect their IDs to check for duplicates later
      const anyMatch = line.match(/^\s*\((\d+),/);
      if (anyMatch) {
        const id = Number(anyMatch[1]);
        if (allIds.has(id)) {
          duplicates.push({ id, line });
        }
        allIds.add(id);
      }
    }
    updatedLines.push(line);
  }
  
  // Also scan the updated Nigerian state lines for any internal/cross duplicates
  // Let's do a double check on the final lines
  const finalIds = new Set();
  const finalDuplicates = [];
  for (const line of updatedLines) {
    const anyMatch = line.match(/^\s*\((\d+),/);
    if (anyMatch) {
      const id = Number(anyMatch[1]);
      if (finalIds.has(id)) {
        finalDuplicates.push({ id, line: line.trim() });
      }
      finalIds.add(id);
    }
  }

  if (finalDuplicates.length > 0) {
    console.error('ERROR: Duplicate IDs found in final generation!', finalDuplicates);
    return;
  }

  await fs.writeFile(migrationFilePath, updatedLines.join('\n'), 'utf-8');
  console.log(`Successfully reverted/updated ${updatedCount} Nigerian state records to their former IDs.`);
  console.log('No duplicate IDs exist in the file.');
}

main().catch(console.error);
