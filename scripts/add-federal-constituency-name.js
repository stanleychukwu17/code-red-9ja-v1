import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const readyDir = path.join(rootDir, 'seed', 'ready');

// ─── Step 1: Build FC id → name lookup from federal-constituencies.sql ──────────

async function buildFcLookup() {
  const sql = await fs.readFile(path.join(readyDir, 'federal-constituencies.sql'), 'utf-8');
  const lookup = {};

  // Each row looks like:
  // (1, 'Arochukwu / Ohafia', 'FC/001/AB', 1, 'Abia', 1, 'Abia North'),
  // id is the first token; name is the first quoted string.
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('(')) continue;

    // Extract id: first integer token at start of tuple
    const idMatch = trimmed.match(/^\((\d+),/);
    if (!idMatch) continue;
    const id = Number(idMatch[1]);

    // Extract name: first single-quoted string
    const nameMatch = trimmed.match(/^\(\d+,\s*'((?:[^']|'')+)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1].replace(/''/g, "'"); // unescape SQL single quotes

    lookup[id] = name;
  }

  console.log(`Built FC lookup: ${Object.keys(lookup).length} constituencies`);
  return lookup;
}

// ─── Step 2: Process state-assembly-constituencies.sql ──────────────────────────

function processSacFile(sql, fcLookup) {
  const lines = sql.split('\n');
  const result = [];
  let tableUpdated = false;
  let insertUpdated = false;

  for (let line of lines) {

    // 1. CREATE TABLE: add federal_constituency_name after federal_constituency_id
    if (!tableUpdated && /\bfederal_constituency_id\b/.test(line) && /INTEGER/.test(line)) {
      result.push(line.trimEnd().endsWith(',') ? line : line.trimEnd() + ',');
      const indent = line.match(/^(\s*)/)[1];
      result.push(`${indent}federal_constituency_name VARCHAR(255) NOT NULL`);
      tableUpdated = true;
      continue;
    }

    // 2. INSERT column list
    if (!insertUpdated && /INSERT INTO state_assembly_constituencies/.test(line) && /federal_constituency_id/.test(line)) {
      line = line.replace(
        /\bfederal_constituency_id\b/,
        'federal_constituency_id, federal_constituency_name'
      );
      insertUpdated = true;
    }

    // 3. Value rows
    if (/^\s*\(/.test(line)) {
      line = injectFcName(line, fcLookup);
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * SAC row ends with: ..., fc_id),  [trailing comment possible]
 * Strategy: split the row on the closing paren boundary, tokenise, find fc_id
 * (which is always the last integer token before close), inject the name, re-join.
 */
function injectFcName(line, fcLookup) {
  const rowMatch = line.match(/^(\s*\()(.+?)(\)[;,]?\s*(?:--.*)?)\s*$/);
  if (!rowMatch) return line;

  const [, open, body, close] = rowMatch;
  const tokens = tokenise(body);

  // Find the fc_id token: the last integer token in the row
  const intTokenIdxs = tokens
    .map((t, i) => ({ i, t }))
    .filter(({ t }) => t.type === 'int');

  if (intTokenIdxs.length === 0) return line;

  const fcTokenIdx = intTokenIdxs[intTokenIdxs.length - 1].i;
  const fcId = Number(tokens[fcTokenIdx].value);
  const fcName = fcLookup[fcId];

  if (!fcName) {
    console.warn(`  ⚠ No FC name found for id=${fcId} in: ${line.trim()}`);
    return line;
  }

  // Inject: replace the fc_id token with fc_id, 'fc_name'
  const escapedName = fcName.replace(/'/g, "''");
  tokens.splice(fcTokenIdx + 1, 0,
    { type: 'sep', value: ', ' },
    { type: 'str', value: `'${escapedName}'` }
  );

  const newBody = tokens.map(t => t.value).join('');
  return open + newBody + close;
}

/**
 * Tokenise a CSV body (SQL values between the outer parens).
 */
function tokenise(body) {
  const tokens = [];
  let i = 0;
  while (i < body.length) {
    if (body[i] === "'") {
      let j = i + 1;
      while (j < body.length) {
        if (body[j] === "'") {
          if (j + 1 < body.length && body[j + 1] === "'") {
            j += 2;
          } else {
            j++;
            break;
          }
        } else {
          j++;
        }
      }
      tokens.push({ type: 'str', value: body.slice(i, j) });
      i = j;
      continue;
    }

    const numMatch = body.slice(i).match(/^-?\d+(?!\w)/);
    if (numMatch) {
      tokens.push({ type: 'int', value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    const nullMatch = body.slice(i).match(/^NULL\b/i);
    if (nullMatch) {
      tokens.push({ type: 'other', value: nullMatch[0] });
      i += nullMatch[0].length;
      continue;
    }

    const sepMatch = body.slice(i).match(/^[\s,]+/);
    if (sepMatch) {
      tokens.push({ type: 'sep', value: sepMatch[0] });
      i += sepMatch[0].length;
      continue;
    }

    tokens.push({ type: 'other', value: body[i] });
    i++;
  }
  return tokens;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const fcLookup = await buildFcLookup();
const filePath = path.join(readyDir, 'state-assembly-constituencies.sql');

console.log(`\nProcessing state-assembly-constituencies.sql...`);
const original = await fs.readFile(filePath, 'utf-8');
const updated = processSacFile(original, fcLookup);

await fs.writeFile(filePath, updated, 'utf-8');
console.log(`  ✓ Written: ${filePath}`);
console.log('\nAll done!');
