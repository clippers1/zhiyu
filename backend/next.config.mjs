import { withPayload } from '@payloadcms/next/withPayload';

export default withPayload({
  poweredByHeader: false,
  // Emit only files traced by the production server. The Docker runtime can
  // then exclude build tooling, source files, node_modules and .next/cache.
  output: 'standalone',
  // Resolve metadata/not-found before sending headers, including non-bot readers.
  htmlLimitedBots: /.*/,
  experimental: { cpus: 2 },
});
