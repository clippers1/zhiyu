import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createLocalReq, getPayload } from 'payload';
import config from '../src/payload.config';
import { relationID, snapshotArticle } from '../src/domain';

const bundledContent = path.resolve('public/content');
const contentDir = process.env.SEED_CONTENT_DIR || (existsSync(bundledContent) ? bundledContent : path.resolve('../public/content'));

const payload = await getPayload({ config });
try {
  const admins = await payload.find({ collection: 'users', where: { roles: { contains: 'admin' } }, limit: 1, depth: 0 });
  const admin: any = admins.docs[0];
  if (!admin) throw new Error('An existing administrator is required.');
  const req = await createLocalReq({ user: { ...admin, collection: 'users' } }, payload);
  let updated = 0;
  for (const kind of ['indicator', 'organ'] as const) {
    for (const file of await readdir(path.join(contentDir, kind))) {
      if (!file.endsWith('.json')) continue;
      const body = JSON.parse(await readFile(path.join(contentDir, kind, file), 'utf8'));
      if (kind !== 'indicator') continue;
      const found = await payload.find({ collection: 'articles', where: { key: { equals: `${kind}:${body.id}` } }, limit: 1, req, depth: 0 });
      const article: any = found.docs[0];
      if (!article) throw new Error(`Missing article ${kind}:${body.id}`);
      if ((article.question || '') !== (body.question || '') || (article.questionAnswer || '') !== (body.questionAnswer || '')
        || JSON.stringify(article.figure || null) !== JSON.stringify(body.figure || null)) {
        await payload.update({ collection: 'articles', id: article.id, req, data: {
          question: body.question || '', questionAnswer: body.questionAnswer || '', figure: body.figure || null,
        } });
      }
      const snapshot = await snapshotArticle(req, article.id);
      const releaseQuery: any = { and: [
        { article: { equals: article.id } }, { channel: { equals: 'demo' } }, { contentHash: { equals: snapshot.hash } },
      ] };
      const releases = await payload.find({ collection: 'releases', where: releaseQuery, limit: 1, sort: '-id', req, depth: 0 });
      const release: any = releases.docs[0] || await payload.create({ collection: 'releases', req, data: { article: article.id, channel: 'demo' } });
      const key = `demo:${kind}:${body.id}`;
      const publications = await payload.find({ collection: 'publications', where: { key: { equals: key } }, limit: 1, req, depth: 0 });
      const reason = '同步问题式标题与图解字段；保留上一修订用于回退。';
      if (publications.docs[0]) {
        if (relationID(publications.docs[0].release) !== release.id || publications.docs[0].withdrawn) {
          await payload.update({ collection: 'publications', id: publications.docs[0].id, req, data: { release: release.id, withdrawn: false, reason } });
        }
      } else await payload.create({ collection: 'publications', req, data: { release: release.id, reason } });
      console.log(`Synced ${kind}:${body.id} (${snapshot.hash.slice(0, 12)}) question="${(body.question || '').slice(0, 14)}" figure=${body.figure ? 'yes' : 'no'}`);
    }
  }
} finally {
  await payload.destroy();
}
process.exit(0);