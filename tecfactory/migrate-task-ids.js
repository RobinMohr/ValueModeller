/**
 * Migration script: Add unique IDs to existing task files.
 * 
 * Renames tasks from: {priority}_{slug}.json
 * To: {priority}_{id}_{slug}.json
 * 
 * Also adds an "id" field to the JSON content.
 * 
 * Usage: node tecfactory/migrate-task-ids.js
 */

import { readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TASKS_DIR = resolve(__dirname, '..', 'tasks');

function generateTaskId() {
  return randomBytes(4).toString('hex');
}

function getNewFilename(task) {
  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
  return `${task.priority}_${task.id}_${slug}.json`;
}

// Check if a filename already has an ID (matches pattern: digit_hexid_slug.json)
function hasIdInFilename(filename) {
  return /^\d+_[a-f0-9]{8}_/.test(filename);
}

const files = readdirSync(TASKS_DIR).filter(f => 
  f.endsWith('.json') && 
  !f.startsWith('0_task_template') &&
  !hasIdInFilename(f)
);

console.log(`Found ${files.length} task files to migrate.`);

for (const file of files) {
  const filepath = join(TASKS_DIR, file);
  try {
    const content = JSON.parse(readFileSync(filepath, 'utf-8'));
    
    // Skip if already has an id
    if (content.id) {
      console.log(`  SKIP (already has id): ${file}`);
      continue;
    }

    // Generate and assign ID
    content.id = generateTaskId();
    const newFilename = getNewFilename(content);
    const newFilepath = join(TASKS_DIR, newFilename);

    // Write new file with ID
    writeFileSync(newFilepath, JSON.stringify(content, null, 2) + '\n', 'utf-8');
    
    // Remove old file
    unlinkSync(filepath);
    
    console.log(`  MIGRATED: ${file} -> ${newFilename}`);
  } catch (err) {
    console.error(`  ERROR: ${file} - ${err.message}`);
  }
}

// Also handle .lock files
const lockFiles = readdirSync(TASKS_DIR).filter(f => f.endsWith('.json.lock'));
for (const lockFile of lockFiles) {
  const baseTaskFile = lockFile.replace('.lock', '');
  // If the base task file no longer exists (was migrated), remove the lock
  if (!existsSync(join(TASKS_DIR, baseTaskFile))) {
    unlinkSync(join(TASKS_DIR, lockFile));
    console.log(`  REMOVED stale lock: ${lockFile}`);
  }
}

console.log('\nMigration complete!');
