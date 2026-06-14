import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const readyDir = path.join(rootDir, 'seed', 'ready');

// ─── Old ID → { newId, name } mapping ─────────────────────────────────────────
// Derived from nigerian_states_old_ids.sql and nigerian_states.sql
const STATE_MAP = {
  288:  { newId: 17, name: 'Jigawa' },
  289:  { newId: 14, name: 'Enugu' },
  290:  { newId: 21, name: 'Kebbi' },
  291:  { newId:  7, name: 'Benue' },
  292:  { newId: 33, name: 'Sokoto' },
  293:  { newId: 37, name: 'Abuja FCT' },
  294:  { newId: 18, name: 'Kaduna' },
  295:  { newId: 23, name: 'Kwara' },
  296:  { newId: 30, name: 'Oyo' },
  297:  { newId: 35, name: 'Yobe' },
  298:  { newId: 22, name: 'Kogi' },
  299:  { newId: 36, name: 'Zamfara' },
  300:  { newId: 19, name: 'Kano' },
  301:  { newId: 25, name: 'Nasarawa' },
  302:  { newId: 31, name: 'Plateau' },
  303:  { newId:  1, name: 'Abia' },
  304:  { newId:  3, name: 'Akwa Ibom' },
  305:  { newId:  6, name: 'Bayelsa' },
  306:  { newId: 24, name: 'Lagos' },
  307:  { newId:  8, name: 'Borno' },
  308:  { newId: 16, name: 'Imo' },
  309:  { newId: 13, name: 'Ekiti' },
  310:  { newId: 15, name: 'Gombe' },
  311:  { newId: 11, name: 'Ebonyi' },
  312:  { newId:  5, name: 'Bauchi' },
  313:  { newId: 20, name: 'Katsina' },
  314:  { newId:  9, name: 'Cross River' },
  315:  { newId:  4, name: 'Anambra' },
  316:  { newId: 10, name: 'Delta' },
  317:  { newId: 26, name: 'Niger' },
  318:  { newId: 12, name: 'Edo' },
  319:  { newId: 34, name: 'Taraba' },
  320:  { newId:  2, name: 'Adamawa' },
  321:  { newId: 28, name: 'Ondo' },
  322:  { newId: 29, name: 'Osun' },
  323:  { newId: 27, name: 'Ogun' },
  4926: { newId: 32, name: 'Rivers' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Replace every occurrence of `state_id: <oldId>` in a value list row with
 * the new id, and inject a state_name column right after the state_id column.
 *
 * The files use patterns like:  (rowId, 'Name', 'CODE', 303, senDistId)
 * or:                           (rowId, 'Name', 'CODE', 'Desc', 'Center', 303)
 *
 * We use a regex that captures each integer-like token in the row and decides
 * whether it is a state_id by checking if it is in STATE_MAP.
 *
 * Strategy: scan each INSERT row, find the known old state_id, replace it with
 * newId and append the state_name literal immediately after.
 */
function processSQL(sql, { addStateNameAfterStateId = true } = {}) {
  // Match every value row: content between ( and ) at the tuple level.
  // We'll work line-by-line to keep it simple and safe.
  const lines = sql.split('\n');
  const result = [];

  // Track whether we've already updated the CREATE TABLE block for this file.
  let tableUpdated = false;

  for (let line of lines) {
    // ── 1. Update CREATE TABLE: add state_name column after state_id ──────────
    if (!tableUpdated && /state_id\s+INTEGER\s+NOT\s+NULL/.test(line)) {
      result.push(line);
      // Insert state_name on the next line with same indentation
      const indent = line.match(/^(\s*)/)[1];
      result.push(`${indent}state_name VARCHAR(255) NOT NULL,`);
      tableUpdated = true;
      continue;
    }

    // ── 2. Update INSERT column list ──────────────────────────────────────────
    if (/INSERT INTO .+ \(/.test(line) && /state_id/.test(line)) {
      line = line.replace(/\bstate_id\b/, 'state_id, state_name');
    }

    // ── 3. Update value rows ──────────────────────────────────────────────────
    // Only process lines that look like value tuples and contain a known old ID
    const hasOldId = Object.keys(STATE_MAP).some(
      (id) => new RegExp(`\\b${id}\\b`).test(line)
    );

    if (hasOldId && /^\s*\(/.test(line)) {
      line = replaceStateIdInRow(line);
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Given a single SQL value row such as:
 *   (1, 'Abia North', 'SD/001/AB', 'Desc...', 'Center', 303),
 *
 * Replace the old state_id integer with newId and inject state_name after it.
 */
function replaceStateIdInRow(line) {
  for (const [oldIdStr, { newId, name }] of Object.entries(STATE_MAP)) {
    const oldId = Number(oldIdStr);
    // Match the old ID as a standalone integer token (not part of a larger number,
    // not inside a quoted string). We look for it preceded by a comma+space or
    // just a comma, and followed by a comma or closing paren.
    // Use a careful regex: old ID surrounded by non-digit boundaries.
    const re = new RegExp(`(?<=,\\s*)${oldId}(?=\\s*[,)])`, 'g');
    if (re.test(line)) {
      const escapedName = name.replace(/'/g, "''");
      line = line.replace(
        new RegExp(`(?<=,\\s*)${oldId}(?=\\s*[,)])`, 'g'),
        `${newId}, '${escapedName}'`
      );
      break; // a row belongs to exactly one state
    }
  }
  return line;
}

// ─── Process files ────────────────────────────────────────────────────────────

const files = [
  'senatorial-districts.sql',
  'federal-constituencies.sql',
  'state-assembly-constituencies.sql',
];

for (const filename of files) {
  const filePath = path.join(readyDir, filename);
  console.log(`Processing ${filename}...`);

  const original = await fs.readFile(filePath, 'utf-8');
  const updated = processSQL(original);

  await fs.writeFile(filePath, updated, 'utf-8');
  console.log(`  ✓ Written: ${filePath}`);
}

console.log('\nAll done!');
