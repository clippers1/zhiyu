import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { zh } from '@payloadcms/translations/languages/zh';
import { en } from '@payloadcms/translations/languages/en';
import { Articles, AuditEvents, Categories, Publications, Releases, Reviews, Sources, Users } from './collections';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.SERVER_URL || 'http://localhost:3108',
  routes: { admin: '/admin', api: '/api/cms' },
  admin: { user: 'users', importMap: { baseDir: dirname }, meta: { titleSuffix: ' · 知愈内容平台' } },
  i18n: { fallbackLanguage: 'zh', supportedLanguages: { zh, en } },
  editor: lexicalEditor(),
  collections: [Users, Categories, Sources, Articles, Reviews, Releases, Publications, AuditEvents],
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI || '', max: 10 },
    push: process.env.PAYLOAD_DB_PUSH === 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  graphQL: { disable: true },
  telemetry: false,
  email: () => ({
    name: 'disabled-until-configured', defaultFromAddress: 'noreply@example.com', defaultFromName: '知愈内容平台',
    sendEmail: async () => { throw new Error('邮件服务尚未配置，请联系后台管理员处理账户恢复。'); },
  }),
});
