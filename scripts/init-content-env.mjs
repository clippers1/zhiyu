import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Generates private deployment artifacts, never project source or tracked files.
const directory = process.argv[2];
const serverURL = process.argv[3];
if (!directory || !path.isAbsolute(directory) || !serverURL) throw new Error('Usage: node scripts/init-content-env.mjs /absolute/private/directory https://example.com');
const origin = new URL(serverURL).origin;
await mkdir(directory, { recursive: true, mode: 0o700 });
const password = randomBytes(24).toString('hex');
const environment = [
  `POSTGRES_PASSWORD=${randomBytes(24).toString('hex')}`,
  `PAYLOAD_SECRET=${randomBytes(48).toString('hex')}`,
  `SERVER_URL=${origin}`, `COOKIE_SECURE=${origin.startsWith('https:')}`,
  'CMS_PORT=3108', 'ENABLE_DEMO_API=true',
].join('\n') + '\n';
await writeFile(path.join(directory, 'compose.env'), environment, { mode: 0o600, flag: 'wx' });
await writeFile(path.join(directory, 'bootstrap.env'), `BOOTSTRAP_EMAIL=admin@zhiyu.local\nBOOTSTRAP_PASSWORD=${password}\nSEED_DEMO=true\nSEED_CONTENT_DIR=/seed-content\n`, { mode: 0o600, flag: 'wx' });
await writeFile(path.join(directory, 'admin-access.txt'), `知愈内容平台\n后台地址：${origin}/admin\n登录邮箱：admin@zhiyu.local\n初始密码：${password}\n\n首次登录后请在账户设置中更换密码并设置实际邮箱。\n管理员账号不具备医学审校资格。请按真实资质另行设置审校成员。\n`, { mode: 0o600, flag: 'wx' });
console.log('Private environment and initial-access files created; no secrets printed.');
