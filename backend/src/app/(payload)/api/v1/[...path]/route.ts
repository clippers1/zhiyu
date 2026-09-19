import { publicContent } from '../../../../../public-api';
export const dynamic = 'force-dynamic';
export const GET = (req: Request, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then(({ path }) => publicContent(req, 'official', path));
