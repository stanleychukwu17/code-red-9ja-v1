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
  const ids = [];
  
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('(')) continue;
    
    const idMatch = trimmed.match(/^\((\d+),/);
    if (!idMatch) continue;
    ids.push(Number(idMatch[1]));
  }
  return ids;
}

// ─── Step 2: Parse new Nigerian state IDs ──────────────────────────────────────

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
  const oldNgIds = await getOldNigerianIds();
  const newNgStates = await getNewStates();
  
  console.log(`Loaded ${oldNgIds.length} old Nigerian IDs.`);
  console.log(`Loaded ${Object.keys(newNgStates).length} new Nigerian state mappings.`);
  
  const migrationFilePath = path.join(goDir, '20260418180438_insert_states.sql');
  const sql = await fs.readFile(migrationFilePath, 'utf-8');
  const lines = sql.split('\n');
  const updatedLines = [];
  
  let ngUpdated = 0;
  let nonNgShifted = 0;
  
  for (let line of lines) {
    // Check if it's a state tuple row
    const ngMatch = line.match(/^(\s*)\((\d+),\s*'((?:[^']|'')+)',\s*161,\s*'NG',/);
    
    if (ngMatch) {
      // It is a Nigerian state: set to new sequential ID (1-37)
      const indent = ngMatch[1];
      const name = ngMatch[3].replace(/''/g, "'");
      const newId = newNgStates[name];
      if (newId !== undefined) {
        line = line.replace(/^\s*\(\d+,/, `${indent}(${newId},`);
        ngUpdated++;
      } else {
        console.warn(`Warning: Could not find new ID for Nigerian state "${name}".`);
      }
    } else {
      // It is a non-Nigerian state row
      const otherMatch = line.match(/^(\s*)\((\d+),/);
      if (otherMatch) {
        const indent = otherMatch[1];
        const stateId = Number(otherMatch[2]);
        
        // If it conflicts with the 1-37 range, reassign it to one of the old Nigerian state IDs
        if (stateId >= 1 && stateId <= 37) {
          const newAssignedId = oldNgIds[stateId - 1];
          line = line.replace(/^\s*\(\d+,/, `${indent}(${newAssignedId},`);
          nonNgShifted++;
        }
      }
    }
    updatedLines.push(line);
  }
  
  // Verify uniqueness of IDs in the generated file
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
    console.error('ERROR: Duplicate IDs found in resolved file!', finalDuplicates);
    return;
  }

  await fs.writeFile(migrationFilePath, updatedLines.join('\n'), 'utf-8');
  console.log(`Successfully mapped ${ngUpdated} Nigerian states to new IDs (1-37).`);
  console.log(`Successfully shifted ${nonNgShifted} conflicting non-Nigerian states to old Nigerian IDs.`);
  console.log('No duplicate IDs exist in the file.');
}

main().catch(console.error);
