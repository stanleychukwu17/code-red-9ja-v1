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

// ─── Step 2: Parse new state IDs ──────────────────────────────────────────────

async function getNewStates() {
  const sql = await fs.readFile(path.join(goDir, 'nigerian_states.sql'), 'utf-8');
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

// ─── Step 3: Process the migration file ──────────────────────────────────────

async function main() {
  const oldStates = await getOldStates();
  const newStates = await getNewStates();
  
  // Build Old ID -> New ID mapping based on state name
  const idMap = {};
  for (const [name, oldId] of Object.entries(oldStates)) {
    const newId = newStates[name];
    if (newId === undefined) {
      console.warn(`Warning: State name "${name}" not found in new states list.`);
      continue;
    }
    idMap[oldId] = newId;
  }
  
  console.log(`Mapped ${Object.keys(idMap).length} states.`);
  
  const migrationFilePath = path.join(goDir, '20260418180438_insert_states.sql');
  const sql = await fs.readFile(migrationFilePath, 'utf-8');
  const lines = sql.split('\n');
  const updatedLines = [];
  let updatedCount = 0;
  
  for (let line of lines) {
    // Match line: (id, 'name', 161, 'NG', ...
    const match = line.match(/^(\s*)\((\d+),\s*'((?:[^']|'')+)',\s*161,\s*'NG',/);
    if (match) {
      const indent = match[1];
      const oldId = Number(match[2]);
      const name = match[3].replace(/''/g, "'");
      
      const newId = idMap[oldId];
      if (newId !== undefined) {
        // Replace the old ID at the beginning of the tuple with the new ID
        // E.g., "(288, " becomes "(1, " (or whatever new ID is)
        line = line.replace(/^\s*\(\d+,/, `${indent}(${newId},`);
        updatedCount++;
      } else {
        console.warn(`Warning: Found Nigerian state row in migration file with old ID ${oldId} ("${name}") but no new ID mapping exists.`);
      }
    }
    updatedLines.push(line);
  }
  
  await fs.writeFile(migrationFilePath, updatedLines.join('\n'), 'utf-8');
  console.log(`Successfully updated ${updatedCount} state records in migration file.`);
}

main().catch(console.error);
