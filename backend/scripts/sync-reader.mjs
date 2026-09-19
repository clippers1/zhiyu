import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Generated copy, not a second frontend source tree. Both Vite and Next use root src/.
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await cp(path.resolve(backend, '../src'), path.join(backend, 'reader'), { recursive: true });
await mkdir(path.join(backend, 'public'), { recursive: true });
await cp(path.resolve(backend, '../public/favicon.svg'), path.join(backend, 'public/favicon.svg'));
console.log('Reader source and favicon synchronized for Next build.');
