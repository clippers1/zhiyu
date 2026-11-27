import { notFound, permanentRedirect } from 'next/navigation';
import { loadPage, pageJsonLd, pageMetadata } from '../../../site';
import Reader from '../Reader';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
type Props = { params: Promise<{ path?: string[] }> };
const pathname = async (props: Props) => '/' + ((await props.params).path || []).join('/');

export async function generateMetadata(props: Props) {
  return pageMetadata(await loadPage(await pathname(props)));
}
export default async function Page(props: Props) {
  const path = await pathname(props);
  if (path === '/map') permanentRedirect('/');
  if (path === '/organs') permanentRedirect('/organs/heart');
  const page = await loadPage(path);
  if (!page) notFound();
  const jsonLd = pageJsonLd(page);
  return <>
    {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />}
    <Reader initialRoute={page.route} runtime={page.runtime} preloaded={page.preloaded} />
  </>;
}
