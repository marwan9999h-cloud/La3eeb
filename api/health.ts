import { applySecurityHeaders, healthHandler } from '../server/apiHandlers';

export default async function handler(req: any, res: any) {
  applySecurityHeaders(res);

  if (req?.method !== 'GET') {
    res?.setHeader?.('Allow', 'GET');
    return res.status(405).json({
      error: 'الطريقة غير مسموحة (Method Not Allowed)',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
  }

  return healthHandler(req, res);
}
