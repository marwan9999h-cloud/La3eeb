import { applySecurityHeaders } from '../server/apiHandlers.js';
import {
  drawRandomFromPack,
  packListPayload,
  storedPlayerToCandidate,
} from '../server/packs.js';

/**
 * GET /api/random-player?pack=<id>  -> { candidate }  (random famous player from the pack)
 * GET /api/random-player?list=1     -> { packs }      (pack metadata for clients)
 *
 * Served entirely from the local famous-players database: free, fast, offline
 * for the AI quota, and always a well-known player with a full local profile.
 */
export default async function handler(req: any, res: any) {
  applySecurityHeaders(res);

  if (req?.method !== 'GET') {
    res?.setHeader?.('Allow', 'GET');
    return res.status(405).json({
      error: 'الطريقة غير مسموحة (Method Not Allowed)',
      errorCode: 'METHOD_NOT_ALLOWED',
    });
  }

  const query = req?.query && typeof req.query === 'object' ? req.query : {};

  if (query.list === '1' || query.list === 'true') {
    return res.status(200).json({ packs: packListPayload() });
  }

  const packId = String(query.pack || '').trim();
  if (!packId) {
    return res.status(400).json({
      error: 'لازم تحدد الباك (pack) اللي عايز تسحب منه.',
      errorCode: 'PACK_REQUIRED',
    });
  }

  const player = drawRandomFromPack(packId);
  if (!player) {
    return res.status(404).json({
      error: 'الباك ده مش موجود أو مفيهوش لعيبة دلوقتي. جرب باك تاني أو دور بالاسم.',
      errorCode: 'PACK_EMPTY',
    });
  }

  return res.status(200).json({ candidate: storedPlayerToCandidate(player) });
}
