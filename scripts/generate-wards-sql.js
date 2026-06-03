import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const wardsJsonPath = path.join(rootDir, 'states', 'wards.json');
const wardsSqlPath = path.join(rootDir, 'states', 'wards.sql');

async function main() {
  try {
    console.log('Reading wards.json...');
    const content = await fs.readFile(wardsJsonPath, 'utf-8');
    const wards = JSON.parse(content);

    console.log(`Loaded ${wards.length} wards. Generating SQL schema and insert rows...`);

    let sql = `-- 1. Create the Wards Table\n`;
    sql += `CREATE TABLE IF NOT EXISTS wards (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    name VARCHAR(255) NOT NULL,\n`;
    sql += `    abbreviation VARCHAR(10) NOT NULL,\n`;
    sql += `    local_government_id INTEGER NOT NULL,\n`;
    sql += `    local_government_name VARCHAR(255) NOT NULL,\n`;
    sql += `    state_id INTEGER NOT NULL,\n`;
    sql += `    state_name VARCHAR(255) NOT NULL\n`;
    sql += `);\n\n`;

    sql += `INSERT INTO wards (id, name, abbreviation, local_government_id, local_government_name, state_id, state_name) VALUES\n`;

    const valueRows = wards.map(ward => {
      const escapedName = ward.name.replace(/'/g, "''");
      const escapedAbbreviation = ward.abbreviation.replace(/'/g, "''");
      const escapedLgaName = ward.local_government_name.replace(/'/g, "''");
      const escapedStateName = ward.state_name.replace(/'/g, "''");
      return `    (${ward.id}, '${escapedName}', '${escapedAbbreviation}', ${ward.local_government_id}, '${escapedLgaName}', ${ward.state_id}, '${escapedStateName}')`;
    });

    sql += valueRows.join(',\n') + ';\n';

    console.log('Writing wards.sql...');
    await fs.writeFile(wardsSqlPath, sql, 'utf-8');
    console.log(`Successfully generated ${wardsSqlPath} with ${wards.length} Wards.`);
  } catch (error) {
    console.error('Error generating Wards SQL:', error);
  }
}

main();
