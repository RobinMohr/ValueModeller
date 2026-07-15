import * as fs from 'fs';
import * as path from 'path';
import sql from 'mssql';

const TASKS_DIR = path.resolve(__dirname, '../../tasks');

interface FileTask {
  id: string;
  title: string;
  priority: number;
  type: string;
  state: string;
  description: string;
  files: string[];
  origin: string;
}

async function migrate() {
  const connectionString = process.env.SQL_CONNECTION_STRING;
  if (!connectionString) {
    console.error('ERROR: Set SQL_CONNECTION_STRING environment variable');
    process.exit(1);
  }

  const pool = await sql.connect(connectionString);
  console.log('Connected to Azure SQL');

  const files = fs.readdirSync(TASKS_DIR).filter((f) => {
    return f.endsWith('.json') && !f.startsWith('0_') && f !== 'README.md';
  });

  console.log(`Found ${files.length} task files to migrate`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(TASKS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const task: FileTask = JSON.parse(content);

      // Validate required fields
      if (!task.title || !task.priority || !task.type || !task.state || !task.origin) {
        console.warn(`  SKIP ${file}: missing required fields`);
        skipped++;
        continue;
      }

      // Validate enum values
      if (![1, 2, 3, 4].includes(task.priority)) {
        console.warn(`  SKIP ${file}: invalid priority ${task.priority}`);
        skipped++;
        continue;
      }
      if (!['improvement', 'problem', 'idea'].includes(task.type)) {
        console.warn(`  SKIP ${file}: invalid type ${task.type}`);
        skipped++;
        continue;
      }
      if (!['todo', 'in-progress', 'developed'].includes(task.state)) {
        console.warn(`  SKIP ${file}: invalid state ${task.state}`);
        skipped++;
        continue;
      }
      if (!['user', 'ai', 'user-assisted'].includes(task.origin)) {
        console.warn(`  SKIP ${file}: invalid origin ${task.origin}`);
        skipped++;
        continue;
      }

      await pool.request()
        .input('title', sql.NVarChar(200), task.title.slice(0, 200))
        .input('priority', sql.TinyInt, task.priority)
        .input('type', sql.VarChar(20), task.type)
        .input('state', sql.VarChar(20), task.state)
        .input('description', sql.NVarChar(sql.MAX), task.description || '')
        .input('files', sql.NVarChar(sql.MAX), JSON.stringify(task.files || []))
        .input('origin', sql.VarChar(20), task.origin)
        .query(`
          INSERT INTO tasks (title, priority, type, state, description, files, origin)
          VALUES (@title, @priority, @type, @state, @description, @files, @origin)
        `);

      console.log(`  OK   ${file}`);
      success++;
    } catch (error: any) {
      console.error(`  FAIL ${file}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\nMigration complete: ${success} inserted, ${skipped} skipped, ${failed} failed`);
  await pool.close();
  process.exit(failed > 0 ? 1 : 0);
}

migrate();
