import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const pollingUnitsJsonPath = path.join(rootDir, 'states', 'polling-units.json');
const pollingUnitsSqlPath = path.join(rootDir, 'states', 'polling-units.sql');

async function main() {
  try {
    console.log('Reading polling-units.json...');
    const content = await fs.readFile(pollingUnitsJsonPath, 'utf-8');
    const units = JSON.parse(content);

    console.log(`Loaded ${units.length} polling units. Generating SQL schema and insert rows...`);

    let sql = `-- 1. Create the Polling Units Table\n`;
    sql += `CREATE TABLE IF NOT EXISTS polling_units (\n`;
    sql += `    id SERIAL PRIMARY KEY,\n`;
    sql += `    name VARCHAR(500) NOT NULL,\n`;
    sql += `    abbreviation VARCHAR(20),\n`;
    sql += `    units VARCHAR(20),\n`;
    sql += `    delimitation VARCHAR(100),\n`;
    sql += `    remark VARCHAR(255),\n`;
    sql += `    registration_area_id INTEGER,\n`;
    sql += `    ward_id INTEGER NOT NULL,\n`;
    sql += `    ward_name VARCHAR(255) NOT NULL,\n`;
    sql += `    local_government_id INTEGER NOT NULL,\n`;
    sql += `    local_government_name VARCHAR(255) NOT NULL,\n`;
    sql += `    state_id INTEGER NOT NULL,\n`;
    sql += `    state_name VARCHAR(255) NOT NULL,\n`;
    sql += `    latitude DOUBLE PRECISION,\n`;
    sql += `    longitude DOUBLE PRECISION,\n`;
    sql += `    precise_location TEXT,\n`;
    sql += `    formatted_address TEXT,\n`;
    sql += `    google_place_id VARCHAR(255)\n`;
    sql += `);\n\n`;

    sql += `INSERT INTO polling_units (\n`;
    sql += `    id, name, abbreviation, units, delimitation, remark,\n`;
    sql += `    registration_area_id, ward_id, ward_name,\n`;
    sql += `    local_government_id, local_government_name,\n`;
    sql += `    state_id, state_name,\n`;
    sql += `    latitude, longitude, precise_location, formatted_address, google_place_id\n`;
    sql += `) VALUES\n`;

    const esc = (val) => (val == null ? 'NULL' : `'${String(val).replace(/'/g, "''")}'`);
    const num = (val) => (val == null ? 'NULL' : Number(val));

    const valueRows = units.map((unit) => {
      const lat = unit.location?.latitude ?? null;
      const lng = unit.location?.longitude ?? null;
      const formattedAddress = unit.location?.formatted_address ?? null;
      const googlePlaceId = unit.location?.google_place_id ?? null;

      return (
        `    (${num(unit.id)}, ${esc(unit.name)}, ${esc(unit.abbreviation)}, ${esc(unit.units)}, ` +
        `${esc(unit.delimitation)}, ${esc(unit.remark)}, ` +
        `${num(unit.registration_area_id)}, ${num(unit.ward_id)}, ${esc(unit.ward_name)}, ` +
        `${num(unit.local_government_id)}, ${esc(unit.local_government_name)}, ` +
        `${num(unit.state_id)}, ${esc(unit.state_name)}, ` +
        `${lat ?? 'NULL'}, ${lng ?? 'NULL'}, ${esc(unit.precise_location)}, ${esc(formattedAddress)}, ${esc(googlePlaceId)})`
      );
    });

    sql += valueRows.join(',\n') + ';\n';

    console.log('Writing polling-units.sql...');
    await fs.writeFile(pollingUnitsSqlPath, sql, 'utf-8');
    console.log(`Successfully generated ${pollingUnitsSqlPath} with ${units.length} polling units.`);
  } catch (error) {
    console.error('Error generating Polling Units SQL:', error);
  }
}

main();
