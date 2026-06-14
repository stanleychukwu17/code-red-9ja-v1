import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve current directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const statesDir = path.join(rootDir, 'states');
const outputFilePath = path.join(statesDir, 'lgas.json');

async function main() {
  try {
    console.log('Starting LGA extraction...');
    const dirEntries = await fs.readdir(statesDir, { withFileTypes: true });
    
    // Filter directories that correspond to states (usually have a double-digit prefix, e.g. "01-abia")
    // or just any directory that contains a `lgas/index.json`
    const stateDirs = [];
    for (const entry of dirEntries) {
      if (entry.isDirectory()) {
        const potentialLgaPath = path.join(statesDir, entry.name, 'lgas', 'index.json');
        try {
          await fs.access(potentialLgaPath);
          stateDirs.push({
            name: entry.name,
            lgaPath: potentialLgaPath
          });
        } catch {
          // Skip directories without lgas/index.json
        }
      }
    }

    // Sort states directories to maintain alphabetical/numerical order (e.g. 01-abia, 02-adamawa, ...)
    stateDirs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`Found ${stateDirs.length} state directories with LGA files.`);

    const allLgas = [];
    for (const state of stateDirs) {
      console.log(`Extracting LGAs from: ${state.name}`);
      const content = await fs.readFile(state.lgaPath, 'utf-8');
      const lgas = JSON.parse(content);
      if (Array.isArray(lgas)) {
        allLgas.push(...lgas);
      } else {
        console.warn(`Warning: LGAs for ${state.name} is not an array.`);
      }
    }

    // Format output JSON with 2 space indentation to match standard format
    const outputContent = JSON.stringify(allLgas, null, 2) + '\n';
    await fs.writeFile(outputFilePath, outputContent, 'utf-8');

    console.log(`Successfully compiled ${allLgas.length} LGAs into ${outputFilePath}`);
  } catch (error) {
    console.error('Error extracting LGAs:', error);
    process.exit(1);
  }
}

main();
