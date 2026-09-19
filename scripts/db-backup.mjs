import { spawn } from 'node:child_process';
import { open, chmod } from 'node:fs/promises';
import path from 'node:path';

const [envFile, destination] = process.argv.slice(2);
if (!envFile || !destination || !path.isAbsolute(envFile) || !path.isAbsolute(destination)) {
  throw new Error('Usage: node scripts/db-backup.mjs /absolute/private/compose.env /absolute/private/backup.dump');
}
const file = await open(destination, 'wx', 0o600);
try {
  await new Promise((resolve, reject) => {
    const child = spawn('docker', ['compose', '--env-file', envFile, 'exec', '-T', 'db', 'pg_dump', '-U', 'zhiyu', '-d', 'zhiyu', '-Fc'], {
      stdio: ['ignore', file.fd, 'inherit'],
    });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Database backup failed (${code}); do not use the incomplete destination file.`)));
  });
} finally { await file.close(); }
await chmod(destination, 0o600);
console.log('Database backup completed. Keep it private: it includes account and editorial data.');
