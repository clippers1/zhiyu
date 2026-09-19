import { withPayload } from '@payloadcms/next/withPayload';

export default withPayload({
  poweredByHeader: false,
  // Resolve metadata/not-found before sending headers, including non-bot readers.
  htmlLimitedBots: /.*/,
  experimental: { cpus: 2 },
});
