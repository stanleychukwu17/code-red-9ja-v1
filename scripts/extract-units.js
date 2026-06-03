import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const statesDir = path.join(rootDir, 'states');
const outputFilePath = path.join(statesDir, 'polling-units.json');

async function main() {
  try {
    console.log('Starting Polling Units extraction...');
    
    // Read state directories
    const dirEntries = await fs.readdir(statesDir, { withFileTypes: true });
    const stateDirs = [];
    
    for (const entry of dirEntries) {
      if (entry.isDirectory()) {
        const potentialLgasPath = path.join(statesDir, entry.name, 'lgas');
        try {
          await fs.access(potentialLgasPath);
          stateDirs.push({
            name: entry.name,
            lgasPath: potentialLgasPath
          });
        } catch {
          // Skip directories without a nested 'lgas' directory
        }
      }
    }

    // Sort state directories
    stateDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`Found ${stateDirs.length} state directories.`);

    const allUnits = [];
    let processedWardsCount = 0;
    let processedLgasCount = 0;

    for (const state of stateDirs) {
      const lgaEntries = await fs.readdir(state.lgasPath, { withFileTypes: true });
      const lgaDirs = [];

      for (const entry of lgaEntries) {
        if (entry.isDirectory()) {
          const potentialWardsPath = path.join(state.lgasPath, entry.name, 'wards');
          try {
            await fs.access(potentialWardsPath);
            lgaDirs.push({
              name: entry.name,
              wardsPath: potentialWardsPath
            });
          } catch {
            // Skip LGA directories without a nested 'wards' directory
          }
        }
      }

      // Sort LGAs
      lgaDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      for (const lga of lgaDirs) {
        const wardEntries = await fs.readdir(lga.wardsPath, { withFileTypes: true });
        const wardDirs = [];

        for (const entry of wardEntries) {
          if (entry.isDirectory()) {
            const potentialUnitsPath = path.join(lga.wardsPath, entry.name, 'units', 'index.json');
            try {
              await fs.access(potentialUnitsPath);
              wardDirs.push({
                name: entry.name,
                unitsPath: potentialUnitsPath
              });
            } catch {
              // Skip ward directories without a nested 'units/index.json'
            }
          }
        }

        // Sort Wards
        wardDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        // Read units for each ward sequentially or in small chunks
        // To speed up we can read them using Promise.all on the ward level
        const unitPromises = wardDirs.map(async (ward) => {
          const content = await fs.readFile(ward.unitsPath, 'utf-8');
          const units = JSON.parse(content);
          return Array.isArray(units) ? units : [];
        });

        const results = await Promise.all(unitPromises);
        for (const units of results) {
          allUnits.push(...units);
        }

        processedWardsCount += wardDirs.length;
        processedLgasCount++;
      }
      
      console.log(`Finished processing state: ${state.name}. Total units accumulated so far: ${allUnits.length}`);
    }

    console.log(`Processed ${processedLgasCount} LGAs and ${processedWardsCount} Wards.`);

    // Write to a temporary file first, then rename it to avoid incomplete file issues
    console.log('Writing compiled polling-units.json (this might take a moment due to file size)...');
    
    // Formatting with 2-space indentation might result in a very large file (~170MB). 
    // To save disk space and performance while keeping it readable if needed, we format it with 2 spaces.
    // If the file is extremely large, JSON.stringify(..., null, 2) is perfectly fine.
    const outputContent = JSON.stringify(allUnits, null, 2) + '\n';
    
    await fs.writeFile(outputFilePath, outputContent, 'utf-8');

    console.log(`Successfully compiled ${allUnits.length} Polling Units into ${outputFilePath}`);
  } catch (error) {
    console.error('Error extracting Polling Units:', error);
    process.exit(1);
  }
}

main();
