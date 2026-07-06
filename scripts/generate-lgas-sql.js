import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const lgasJsonPath = path.join(rootDir, 'states', 'lgas.json');
const lgasSqlPath = path.join(rootDir, 'states', 'lgas.sql');

async function main() {
  try {
    const content = await fs.readFile(lgasJsonPath, 'utf-8');
    const lgas = JSON.parse(content);

    let sql = `-- 1. Create the LGAs Table\n`;
    sql += `CREATE TABLE IF NOT EXISTS lgas (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    name VARCHAR(255) NOT NULL,\n`;
    sql += `    abbreviation VARCHAR(10) NOT NULL,\n`;
    sql += `    state_id INTEGER NOT NULL,\n`;
    sql += `    state_name VARCHAR(255) NOT NULL\n`;
    sql += `);\n\n`;

    sql += `INSERT INTO lgas (id, name, abbreviation, state_id, state_name) VALUES\n`;

    const valueRows = lgas.map(lga => {
      // Escape single quotes in names just in case
      const escapedName = lga.name.replace(/'/g, "''");
      const escapedAbbreviation = lga.abbreviation.replace(/'/g, "''");
      const escapedStateName = lga.state_name.replace(/'/g, "''");
      return `    (${lga.id}, '${escapedName}', '${escapedAbbreviation}', ${lga.state_id}, '${escapedStateName}')`;
    });

    sql += valueRows.join(',\n') + ';\n';

    await fs.writeFile(lgasSqlPath, sql, 'utf-8');
    console.log(`Successfully generated ${lgasSqlPath} with ${lgas.length} LGAs including state_name.`);
  } catch (error) {
    console.error('Error generating LGAs SQL:', error);
  }
}

main();
