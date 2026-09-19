import { feedbackAPI } from '../../../../../feedback-api';
export const dynamic = 'force-dynamic';
export const POST = (req: Request, { params }: { params: Promise<{ action: string }> }) =>
  params.then(({ action }) => feedbackAPI(req, action));
