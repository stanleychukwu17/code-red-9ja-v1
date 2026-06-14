import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const statesDir = path.join(rootDir, 'states');
const outputFilePath = path.join(statesDir, 'wards.json');

async function main() {
  try {
    console.log('Starting Wards extraction...');
    
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

    // Sort state directories to maintain order
    stateDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`Found ${stateDirs.length} state directories.`);

    const allWards = [];
    let processedLgasCount = 0;

    for (const state of stateDirs) {
      const lgaEntries = await fs.readdir(state.lgasPath, { withFileTypes: true });
      const lgaDirs = [];

      for (const entry of lgaEntries) {
        if (entry.isDirectory()) {
          const potentialWardsPath = path.join(state.lgasPath, entry.name, 'wards', 'index.json');
          try {
            await fs.access(potentialWardsPath);
            lgaDirs.push({
              name: entry.name,
              wardsPath: potentialWardsPath
            });
          } catch {
            // Skip LGA directories without a nested wards/index.json
          }
        }
      }

      // Sort LGAs to maintain order (e.g. 01-aba-north, 02-aba-south...)
      lgaDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

      for (const lga of lgaDirs) {
        const content = await fs.readFile(lga.wardsPath, 'utf-8');
        const wards = JSON.parse(content);
        if (Array.isArray(wards)) {
          allWards.push(...wards);
          processedLgasCount++;
        } else {
          console.warn(`Warning: Wards for state "${state.name}", LGA "${lga.name}" is not an array.`);
        }
      }
    }

    console.log(`Processed ${processedLgasCount} LGAs.`);

    // Format output JSON with 2 space indentation to match standard format
    const outputContent = JSON.stringify(allWards, null, 2) + '\n';
    await fs.writeFile(outputFilePath, outputContent, 'utf-8');

    console.log(`Successfully compiled ${allWards.length} Wards into ${outputFilePath}`);
  } catch (error) {
    console.error('Error extracting Wards:', error);
    process.exit(1);
  }
}

main();
