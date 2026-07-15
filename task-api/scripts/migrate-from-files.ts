/**
 * Migration Script: JSON Files → Azure SQL
 *
 * Reads all tasks/*.json files (skipping 0_task_template.json and README.md),
 * validates them against the task schema, and bulk-inserts into the Azure SQL
 * tasks table. Handles duplicates via upsert (MERGE statement).
 *
 * Usage:
 *   npx ts-node task-api/scripts/migrate-from-files.ts
 *
 * Environment:
 *   Requires SQL_CONNECTION_STRING (or SQL_SERVER, SQL_DATABASE, SQL_USER, SQL_PASSWORD)
 *   to be set in environment or in task-api/local.settings.json.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getPool, closePool } from '../src/db/client.js';
import { taskSchema } from '../src/validation/task-schema.js';

interface MigrationResult {
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ file: string; reason: string }>;
}

/**
 * Load environment from local.settings.json if env vars are not set.
 */
function loadLocalSettings(): void {
  const settingsPath = path.resolve(__dirname, '..', 'local.settings.json');
  if (!process.env['SQL_CONNECTION_STRING'] && !process.env['SQL_SERVER']) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(raw) as { Values?: Record<string, string> };
      if (settings.Values) {
        for (const [key, value] of Object.entries(settings.Values)) {
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      console.log('[migrate] Loaded environment from local.settings.json');
    } catch {
      // No local.settings.json or cannot parse — rely on env vars
    }
  }
}

/**
 * Reads and parses a single task JSON file, returning the validated task data.
 */
function readTaskFile(filePath: string): { id: string; title: string; priority: number; type: string; state: string; description: string; files: string[]; origin: string } | null {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  const result = taskSchema.safeParse(parsed);
  if (!result.success) {
    return null;
  }
  return result.data;
}

/**
 * Performs the migration: reads task files, validates, upserts into Azure SQL.
 */
async function migrate(): Promise<MigrationResult> {
  const tasksDir = path.resolve(__dirname, '..', '..', 'tasks');
  const result: MigrationResult = { inserted: 0, updated: 0, skipped: 0, failed: 0, errors: [] };

  // Discover task files
  const files = fs.readdirSync(tasksDir).filter((f) => {
    if (!f.endsWith('.json')) return false;
    if (f === '0_task_template.json') return false;
    if (f.endsWith('.lock')) return false;
    return true;
  });

  console.log(`[migrate] Found ${files.length} task file(s) in ${tasksDir}`);

  if (files.length === 0) {
    console.log('[migrate] No files to migrate.');
    return result;
  }

  // Connect to database
  const pool = await getPool();
  console.log('[migrate] Connected to Azure SQL.');

  const now = new Date().toISOString();

  for (const file of files) {
    const filePath = path.join(tasksDir, file);

    try {
      const task = readTaskFile(filePath);
      if (!task) {
        result.failed++;
        result.errors.push({ file, reason: 'Validation failed — does not match task schema' });
        continue;
      }

      if (!task.id || task.id.trim() === '') {
        result.skipped++;
        result.errors.push({ file, reason: 'Missing or empty id field' });
        continue;
      }

      // Upsert via MERGE statement (handles duplicates gracefully)
      const request = pool.request();
      request.input('id', task.id);
      request.input('title', task.title);
      request.input('priority', task.priority);
      request.input('type', task.type);
      request.input('state', task.state);
      request.input('description', task.description);
      request.input('files', JSON.stringify(task.files));
      request.input('origin', task.origin);
      request.input('now', now);

      const mergeResult = await request.query(`
        MERGE tasks AS target
        USING (SELECT @id AS id) AS source
        ON target.id = source.id
        WHEN MATCHED THEN
          UPDATE SET
            title = @title,
            priority = @priority,
            type = @type,
            state = @state,
            description = @description,
            files = @files,
            origin = @origin,
            updated_at = @now
        WHEN NOT MATCHED THEN
          INSERT (id, title, priority, type, state, description, files, origin, created_at, updated_at)
          VALUES (@id, @title, @priority, @type, @state, @description, @files, @origin, @now, @now);
      `);

      // MERGE always affects 1 row. We check $action to determine insert vs update.
      // Since standard MERGE doesn't easily expose $action in rowsAffected,
      // we count based on rowsAffected > 0
      if (mergeResult.rowsAffected[0] > 0) {
        // Try to detect if it was an insert or update by checking if the task existed before
        // For simplicity, we just count it as a success
        result.inserted++;
      }

      console.log(`  ✓ ${file} (id: ${task.id})`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed++;
      result.errors.push({ file, reason: message });
      console.error(`  ✗ ${file}: ${message}`);
    }
  }

  return result;
}

/**
 * Main entry point — runs migration and reports results.
 */
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Migration: JSON Task Files → Azure SQL         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  loadLocalSettings();

  try {
    const result = await migrate();

    console.log('');
    console.log('────────────────────────────────────────');
    console.log('  Migration Results');
    console.log('────────────────────────────────────────');
    console.log(`  Upserted:  ${result.inserted}`);
    console.log(`  Skipped:   ${result.skipped}`);
    console.log(`  Failed:    ${result.failed}`);
    console.log(`  Total:     ${result.inserted + result.skipped + result.failed}`);
    console.log('────────────────────────────────────────');

    if (result.errors.length > 0) {
      console.log('');
      console.log('  Errors:');
      for (const err of result.errors) {
        console.log(`    • ${err.file}: ${err.reason}`);
      }
    }

    if (result.failed === 0) {
      console.log('');
      console.log('  ✅ Migration completed successfully!');
    } else {
      console.log('');
      console.log(`  ⚠️  Migration completed with ${result.failed} error(s).`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error(`  ❌ Migration failed: ${message}`);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();
