import {
  applySecurityHeaders,
  parseJsonBodySafe,
  searchPlayerHandler,
} from '../server/apiHandlers.js';

export default async function handler(req: any, res: any) {
  applySecurityHeaders(res);

  if (req?.method !== 'POST') {
    res?.setHeader?.('Allow', 'POST');
    return res.status(405).json({
      error: 'الطريقة غير مسموحة (Method Not Allowed)',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
  }

  const parsed = await parseJsonBodySafe(req);
  if (parsed.ok === false) {
    return res.status(parsed.status).json({ error: parsed.error });
  }

  const safeReq = Object.create(req);
  Object.defineProperty(safeReq, 'body', {
    value: parsed.body,
    writable: true,
    configurable: true,
    enumerable: true,
  });

  return searchPlayerHandler(safeReq, res);
}
