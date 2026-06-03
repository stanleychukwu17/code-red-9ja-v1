import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const readyDir = path.join(rootDir, 'seed', 'ready');

// ─── Step 1: Build SD id → name lookup from senatorial-districts.sql ──────────

async function buildSdLookup() {
  const sql = await fs.readFile(path.join(readyDir, 'senatorial-districts.sql'), 'utf-8');
  const lookup = {};

  // Each row looks like:
  //   (1, 'Abia North', 'SD/001/AB', 'Comprising ...', 'Ohafia LGA HQS', 1, 'Abia'),
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

  console.log(`Built SD lookup: ${Object.keys(lookup).length} districts`);
  return lookup;
}

// ─── Step 2: Process a SQL file ───────────────────────────────────────────────

/**
 * @param {string} sql         - original file content
 * @param {object} sdLookup    - { [sdId]: sdName }
 * @param {'fc'|'sac'} fileType
 */
function processFile(sql, sdLookup, fileType) {
  const lines = sql.split('\n');
  const result = [];
  let tableUpdated = false;
  let insertUpdated = false;

  for (let line of lines) {

    // ── 1. CREATE TABLE: add senatorial_district_name after senatorial_district_id ──
    if (!tableUpdated && /\bsenatorial_district_id\b/.test(line) && /INTEGER/.test(line)) {
      result.push(line);
      // Add new column with same indentation
      const indent = line.match(/^(\s*)/)[1];
      const comma = line.trimEnd().endsWith(',') ? '' : ',';
      // Ensure the existing line has a trailing comma
      if (!line.trimEnd().endsWith(',')) {
        result[result.length - 1] = line.trimEnd() + ',';
      }
      result.push(`${indent}senatorial_district_name VARCHAR(255) NOT NULL`);
      tableUpdated = true;
      continue;
    }

    // ── 2. INSERT column list ────────────────────────────────────────────────
    if (!insertUpdated && /INSERT INTO .+\(/.test(line) && /senatorial_district_id/.test(line)) {
      if (fileType === 'fc') {
        // senatorial_district_id is last column → append senatorial_district_name
        line = line.replace(
          /\bsenatorial_district_id\b/,
          'senatorial_district_id, senatorial_district_name'
        );
      } else {
        // SAC: senatorial_district_id comes before federal_constituency_id
        line = line.replace(
          /\bsenatorial_district_id\b/,
          'senatorial_district_id, senatorial_district_name'
        );
      }
      insertUpdated = true;
    }

    // ── 3. Value rows ─────────────────────────────────────────────────────────
    if (/^\s*\(/.test(line)) {
      line = injectSdName(line, sdLookup, fileType);
    }

    result.push(line);
  }

  return result.join('\n');
}

/**
 * Given a value row, inject senatorial_district_name after senatorial_district_id.
 *
 * FC row ends with:  ..., state_name, sd_id),  [trailing comment possible]
 * SAC row ends with: ..., state_name, sd_id, fc_id),  [trailing comment possible]
 *
 * Strategy: split the row on the closing paren boundary, tokenise, find sd_id
 * (which is always a plain integer, not inside quotes), inject the name, re-join.
 */
function injectSdName(line, sdLookup, fileType) {
  // Separate the tuple body from any trailing comment / punctuation
  // Match: leading-whitespace ( ... ) optional-semicolon/comma optional-comment
  const rowMatch = line.match(/^(\s*\()(.+?)(\)[;,]?\s*(?:--.*)?)\s*$/);
  if (!rowMatch) return line;

  const [, open, body, close] = rowMatch;

  // Tokenise body respecting single-quoted strings
  // (we need positions of integer tokens to identify the sd_id)
  const tokens = tokenise(body);

  // Find the sd_id token:
  //   FC:  sd_id is the LAST integer token in the row
  //   SAC: sd_id is the SECOND-TO-LAST integer token (fc_id is the very last)
  const intTokenIdxs = tokens
    .map((t, i) => ({ i, t }))
    .filter(({ t }) => t.type === 'int');

  if (intTokenIdxs.length === 0) return line;

  let sdTokenIdx;
  if (fileType === 'fc') {
    sdTokenIdx = intTokenIdxs[intTokenIdxs.length - 1].i;
  } else {
    // SAC: second-to-last integer
    if (intTokenIdxs.length < 2) return line;
    sdTokenIdx = intTokenIdxs[intTokenIdxs.length - 2].i;
  }

  const sdId = Number(tokens[sdTokenIdx].value);
  const sdName = sdLookup[sdId];
  if (!sdName) {
    console.warn(`  ⚠ No SD name found for id=${sdId} in: ${line.trim()}`);
    return line;
  }

  // Inject: replace the sd_id token with sd_id, 'sd_name'
  const escapedName = sdName.replace(/'/g, "''");
  tokens.splice(sdTokenIdx + 1, 0,
    { type: 'sep', value: ', ' },
    { type: 'str', value: `'${escapedName}'` }
  );

  const newBody = tokens.map(t => t.value).join('');
  return open + newBody + close;
}

/**
 * Tokenise a CSV body (SQL values between the outer parens).
 * Returns array of { type: 'int'|'str'|'sep'|'other', value: string }
 */
function tokenise(body) {
  const tokens = [];
  let i = 0;
  while (i < body.length) {
    // Single-quoted string (with possible '' escapes)
    if (body[i] === "'") {
      let j = i + 1;
      while (j < body.length) {
        if (body[j] === "'") {
          if (j + 1 < body.length && body[j + 1] === "'") {
            j += 2; // escaped quote
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

    // Integer (standalone number)
    const numMatch = body.slice(i).match(/^-?\d+(?!\w)/);
    if (numMatch) {
      tokens.push({ type: 'int', value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    // NULL keyword
    const nullMatch = body.slice(i).match(/^NULL\b/i);
    if (nullMatch) {
      tokens.push({ type: 'other', value: nullMatch[0] });
      i += nullMatch[0].length;
      continue;
    }

    // Separator/whitespace/punctuation (commas, spaces)
    const sepMatch = body.slice(i).match(/^[\s,]+/);
    if (sepMatch) {
      tokens.push({ type: 'sep', value: sepMatch[0] });
      i += sepMatch[0].length;
      continue;
    }

    // Fallback: consume one character
    tokens.push({ type: 'other', value: body[i] });
    i++;
  }
  return tokens;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const sdLookup = await buildSdLookup();

const files = [
  { name: 'federal-constituencies.sql',       type: 'fc'  },
  { name: 'state-assembly-constituencies.sql', type: 'sac' },
];

for (const { name, type } of files) {
  const filePath = path.join(readyDir, name);
  console.log(`\nProcessing ${name}...`);

  const original = await fs.readFile(filePath, 'utf-8');
  const updated  = processFile(original, sdLookup, type);

  await fs.writeFile(filePath, updated, 'utf-8');
  console.log(`  ✓ Written: ${filePath}`);
}

console.log('\nAll done!');
