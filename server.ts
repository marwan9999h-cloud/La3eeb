import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  searchBuiltinPlayers,
  getBuiltinPlayerByIdOrName,
  generateLocalAssistantReply,
  normalizeSearch,
  computeAge,
  selfTestComputeAge,
  validateDatabase,
  FAMOUS_PLAYERS_DB,
  StoredPlayer,
  searchFuzzy,
} from './server/playerDatabase';
import { PLAYERS_INDEX, searchPlayersIndex } from './server/playersIndex';
import { normalizeProfile, createUnavailableProfile } from './server/profileUtils';

dotenv.config();

// Run startup database validations and self-tests
selfTestComputeAge();
validateDatabase();

const app = express();
const PORT = 3000;

// Security settings (AI Studio preview iframe friendly: NO X-Frame-Options or frame-ancestors)
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

// JSON body parser with 50kb limit
app.use(express.json({ limit: '50kb' }));

// Custom JSON error handler
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (err && (err.type === 'entity.parse.failed' || err.status === 400)) {
    return res.status(400).json({ error: 'طلب غير صالح (Invalid JSON)' });
  }
  if (err && err.status === 413) {
    return res.status(413).json({ error: 'حجم الطلب كبير جداً (Payload Too Large)' });
  }
  next(err);
});

// In-memory Rate Limiting (Fixed 60s Window)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStores = {
  search: new Map<string, RateLimitBucket>(),
  profile: new Map<string, RateLimitBucket>(),
  assistant: new Map<string, RateLimitBucket>(),
};

function checkRateLimit(type: 'search' | 'profile' | 'assistant', ip: string, maxRequests: number): boolean {
  const now = Date.now();
  const store = rateLimitStores[type];
  const record = store.get(ip);

  if (!record || now > record.resetAt) {
    store.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Periodic cleanup of expired rate limit buckets (every 60s)
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  for (const store of Object.values(rateLimitStores)) {
    for (const [ip, bucket] of store.entries()) {
      if (now > bucket.resetAt) {
        store.delete(ip);
      }
    }
  }
}, 60 * 1000);
rateLimitCleanup.unref();

// TTL-based Caches with size limit (max 500 entries)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private maxEntries: number;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) this.map.delete(oldestKey);
    }
    this.map.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  get size(): number {
    return this.map.size;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.map.entries()) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
      }
    }
  }
}

const searchCache = new TtlCache<any>(500);
const profileCache = new TtlCache<any>(500);

const cacheCleanupTimer = setInterval(() => {
  searchCache.cleanup();
  profileCache.cleanup();
}, 60 * 1000);
cacheCleanupTimer.unref();

// Gemini Client and Model Availability Management
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
const modelCooldowns: Record<string, number> = {};

const GEMINI_MODELS: string[] = process.env.GEMINI_MODELS
  ? process.env.GEMINI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
  : ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

function isModelAvailable(model: string): boolean {
  if (!apiKey) return false;
  const cooldownUntil = modelCooldowns[model] || 0;
  return Date.now() > cooldownUntil;
}

function handleModelError(model: string, error: any) {
  const errMsg = String(error?.message || error || '');
  const status = error?.status || error?.code;

  if (
    status === 404 ||
    status === 'NOT_FOUND' ||
    status === 'INVALID_ARGUMENT' ||
    errMsg.includes('not found') ||
    errMsg.includes('models/')
  ) {
    console.warn(`[Model Incompatible] Model ${model} unavailable (404/Invalid). Disabling for 30 minutes.`);
    modelCooldowns[model] = Date.now() + 30 * 60 * 1000;
  } else if (
    status === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    errMsg.includes('429') ||
    errMsg.includes('RESOURCE_EXHAUSTED') ||
    errMsg.includes('quota')
  ) {
    console.warn(`[Quota Limit] Model ${model} rate-limited. Setting 45s cooldown.`);
    modelCooldowns[model] = Date.now() + 45 * 1000;
  }
}

function isAnyGeminiAvailable(): boolean {
  return Boolean(apiKey) && GEMINI_MODELS.some(isModelAvailable);
}

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Fallback search using free Wikipedia API
async function searchWikipediaPlayer(query: string): Promise<any | null> {
  try {
    const url = `https://ar.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query + ' لاعب كرة قدم'
    )}&srlimit=5&utf8=&format=json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'La3eebFootballGame/2.0' },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const items = data?.query?.search;
    if (!Array.isArray(items) || items.length === 0) return null;

    // Filter strictly by keywords - NO items[0] blind fallback
    const valid = items.find((item: any) => {
      const text = (item.title + ' ' + (item.snippet || '')).toLowerCase();
      return (
        text.includes('كرة قدم') ||
        text.includes('لاعب كرة') ||
        text.includes('نادي') ||
        text.includes('منتخب')
      );
    });

    if (!valid) return null;

    const rawSnippet = (valid.snippet || '').replace(/<[^>]*>/g, '');
    const cleanTitle = valid.title.replace(/\s*\(لاعب كرة قدم.*?\)/gi, '').trim();

    return {
      id: 'wiki-' + valid.pageid,
      name: cleanTitle,
      displayName: cleanTitle,
      nationality: 'دولي',
      position: rawSnippet.includes('حارس')
        ? 'حارس مرمى'
        : rawSnippet.includes('مدافع')
        ? 'مدافع'
        : rawSnippet.includes('وسط')
        ? 'لاعب وسط'
        : 'مهاجم / لاعب كرة قدم',
      currentClubOrLast: 'نادي محترف',
      isRetired: rawSnippet.includes('كان') || rawSnippet.includes('سابق') || rawSnippet.includes('اعتزل'),
      eraOrNote: 'لاعب من ويكيبيديا العربية',
    };
  } catch (err) {
    console.warn('Wikipedia search error or timeout:', err);
    return null;
  }
}

// Helper to extract JSON from Gemini text safely
function extractJson(text: string): any {
  if (!text) return null;
  try {
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiAvailable: isAnyGeminiAvailable(),
    dbPlayersCount: FAMOUS_PLAYERS_DB.length,
    indexPlayersCount: PLAYERS_INDEX.length,
    cachedSearches: searchCache.size,
    cachedProfiles: profileCache.size,
    timestamp: new Date().toISOString(),
  });
});

// 1. Search player endpoint (POST only, handles rate limit, cache, local DB, Gemini, and Wikipedia)
app.post('/api/search-player', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit('search', clientIp, 40)) {
    return res.status(429).json({
      error: 'تجاوزت الحد المسموح من عمليات البحث. استنى شوية وجرب تاني.',
      errorCode: 'RATE_LIMITED',
    });
  }

  let trimmedQuery = '';
  try {
    const rawQuery = req.body?.query;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return res.status(400).json({ error: 'من فضلك اكتب اسم لاعب' });
    }

    trimmedQuery = rawQuery.trim();
    if (trimmedQuery.length > 60) {
      trimmedQuery = trimmedQuery.slice(0, 60).trim();
    }

    const normalizedKey = normalizeSearch(trimmedQuery);

    // Step 1: Check in-memory search cache
    if (searchCache.has(normalizedKey)) {
      return res.json(searchCache.get(normalizedKey));
    }

    // Step 2: Check local rich database for instant zero-latency response
    const localMatches = searchBuiltinPlayers(trimmedQuery);
    if (localMatches.length > 0) {
      const isAmbiguous =
        localMatches.length > 1 &&
        (trimmedQuery.length <= 8 ||
          normalizedKey === 'رونالدو' ||
          normalizedKey === 'ronaldo' ||
          normalizedKey === 'سيلفا' ||
          normalizedKey === 'توريس' ||
          normalizedKey === 'ديمبيلي' ||
          normalizedKey === 'سواريز' ||
          normalizedKey === 'مارتينيز' ||
          normalizedKey === 'ميندي');

      const candidates = localMatches.slice(0, 4).map((p: StoredPlayer) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        nationality: p.nationality,
        position: p.position,
        currentClubOrLast: p.currentClub || p.lastClub || p.clubs[p.clubs.length - 1],
        isRetired: p.isRetired,
        eraOrNote: p.eraOrNote || (p.isRetired ? 'أسطورة معتزل' : 'لاعب حالي'),
      }));

      const result = {
        exactMatch: !isAmbiguous,
        ambiguous: isAmbiguous,
        candidates,
      };

      searchCache.set(normalizedKey, result, 7 * 24 * 60 * 60 * 1000); // 7 days
      return res.json(result);
    }

    // Step 2.5: Check lightweight players index
    const indexMatches = searchPlayersIndex(trimmedQuery);
    if (indexMatches.length > 0) {
      const isAmbiguous = indexMatches.length > 1 && trimmedQuery.length <= 8;
      const candidates = indexMatches.slice(0, 4).map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        nationality: p.nationality,
        position: p.position,
        currentClubOrLast: p.isRetired ? 'معتزل' : 'لاعب حالي',
        isRetired: p.isRetired,
        eraOrNote: p.isRetired ? 'لاعب معتزل' : 'لاعب حالي',
      }));

      const result = {
        exactMatch: !isAmbiguous,
        ambiguous: isAmbiguous,
        candidates,
      };

      searchCache.set(normalizedKey, result, 7 * 24 * 60 * 60 * 1000); // 7 days
      return res.json(result);
    }

    // Step 2.6: Fuzzy search if regular search returned 0 results
    const fuzzyMatches = searchFuzzy(trimmedQuery, [...FAMOUS_PLAYERS_DB, ...PLAYERS_INDEX]);
    if (fuzzyMatches.length > 0) {
      const candidates = fuzzyMatches.slice(0, 4).map((p: any) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        nationality: p.nationality,
        position: p.position,
        currentClubOrLast:
          p.currentClub ||
          p.lastClub ||
          (p.clubs && p.clubs.length > 0 ? p.clubs[p.clubs.length - 1] : p.isRetired ? 'معتزل' : 'لاعب حالي'),
        isRetired: p.isRetired,
        eraOrNote: p.eraOrNote || (p.isRetired ? 'لاعب معتزل' : 'لاعب حالي'),
      }));

      const result = {
        exactMatch: false,
        ambiguous: false,
        candidates,
      };

      searchCache.set(normalizedKey, result, 7 * 24 * 60 * 60 * 1000); // 7 days
      return res.json(result);
    }

    // Diagnostics tracking for error resolution
    let geminiQuotaExhausted = false;
    let geminiNetworkError = false;

    // Step 3: Call Gemini API if available
    if (isAnyGeminiAvailable()) {
      const ai = getAiClient();
      const prompt = `أنت خبير كروي في لعبة "مين اللاعب؟" المصرية.
المستخدم يبحث عن لاعب كرة قدم بالاسم أو اللقب: "${trimmedQuery}".

المطلوب:
1. حدد بدقة لاعب (أو لاعبي) كرة القدم الحقيقيين المقصودين.
2. إذا كان الاسم غامضاً أو يحتمل أكثر من لاعب مشهور ومعروف (مثل "رونالدو" -> كريستيانو رونالدو و رونالدو الظاهرة، أو "سيلفا" -> برناردو سيلفا وديفيد سيلفا وتياجو سيلفا)، اجعل ambiguous = true وضع قائمة بالخيارات (بحد أقصى 4 لاعبين).
3. إذا كان الاسم واضحاً ومحدداً (مثل "ميسي", "محمد صلاح", "هالاند", "تريزيجيه", "شيكابالا"), اجعل exactMatch = true واجعل ambiguous = false.
4. إذا لم يكن لاعب كرة قدم حقيقي، اجعل candidates مصفوفة فارغة [].

أعد النتيجة بصيغة JSON حصراً بهذا الهيكل الدقيق:
{
  "exactMatch": boolean,
  "ambiguous": boolean,
  "candidates": [
    {
      "id": "معرف إنجليزي فريد مثل cristiano-ronaldo",
      "name": "Official Full Name in English",
      "displayName": "الاسم الشائع باللغة العربية",
      "nationality": "الجنسية بالعربي",
      "position": "المركز بالعربي (مهاجم / خط وسط / مدافع / حارس مرمى / جناح)",
      "currentClubOrLast": "النادي الحالي أو آخر نادي لعب له إذا معتزل",
      "isRetired": boolean,
      "eraOrNote": "ملاحظة توضيحية قصيرة لتمييزه"
    }
  ]
}`;

      const modelsToTry = GEMINI_MODELS.filter(isModelAvailable);
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const data = extractJson(response.text || '');
          if (data && Array.isArray(data.candidates) && data.candidates.length > 0) {
            searchCache.set(normalizedKey, data, 7 * 24 * 60 * 60 * 1000); // 7 days
            return res.json(data);
          }
          if (data && Array.isArray(data.candidates) && data.candidates.length === 0) {
            break;
          }
        } catch (geminiError: any) {
          handleModelError(model, geminiError);
          const errMsg = String(geminiError?.message || geminiError || '');
          const status = geminiError?.status || geminiError?.code;
          if (
            status === 429 ||
            status === 'RESOURCE_EXHAUSTED' ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('quota')
          ) {
            geminiQuotaExhausted = true;
          } else if (
            errMsg.includes('fetch') ||
            errMsg.includes('network') ||
            errMsg.includes('ECONNREFUSED') ||
            errMsg.includes('timeout') ||
            errMsg.includes('ENOTFOUND')
          ) {
            geminiNetworkError = true;
          }
        }
      }
    } else if (apiKey) {
      geminiQuotaExhausted = true;
    }

    // Step 4: Resilient Free Wikipedia Fallback (srlimit=5, keyword validation, no blind fallback)
    let wikiNetworkError = false;
    let wikiCandidate: any = null;
    try {
      wikiCandidate = await searchWikipediaPlayer(trimmedQuery);
      if (wikiCandidate) {
        const wikiResult = {
          exactMatch: false,
          ambiguous: false,
          candidates: [wikiCandidate],
        };
        searchCache.set(normalizedKey, wikiResult, 24 * 60 * 60 * 1000); // 1 day
        return res.json(wikiResult);
      }
    } catch {
      wikiNetworkError = true;
    }

    // Step 5: Suggested candidate for Plan B direct play
    const suggestedCandidate = {
      id: `direct-${Date.now()}`,
      name: trimmedQuery,
      displayName: trimmedQuery,
      nationality: 'اختيار مباشر',
      position: 'لاعب كرة قدم',
      currentClubOrLast: 'في سرك 🤫',
      isRetired: false,
      eraOrNote: 'نمط اللعب المباشر — اللاعب في بالك',
    };

    if (geminiQuotaExhausted) {
      return res.status(200).json({
        candidates: [],
        exactMatch: false,
        ambiguous: false,
        error: 'تم استنفاد حصة البحث الذكي مؤقتاً (Gemini Quota). تقدر تعيد المحاولة بعد لحظات، أو تكمل وتلعب في سرك فوراً.',
        errorCode: 'QUOTA_EXHAUSTED',
        canFallbackToDirectPlay: true,
        planB: {
          available: true,
          query: trimmedQuery,
          suggestedCandidate,
        },
      });
    }

    if (geminiNetworkError || wikiNetworkError) {
      return res.status(200).json({
        candidates: [],
        exactMatch: false,
        ambiguous: false,
        error: 'تعذر الاتصال بخدمة البحث بسبب مشكلة في الشبكة. تقدر تعيد المحاولة أو تلعب به في سرك.',
        errorCode: 'NETWORK_ERROR',
        canFallbackToDirectPlay: true,
        planB: {
          available: true,
          query: trimmedQuery,
          suggestedCandidate,
        },
      });
    }

    searchCache.set(
      normalizedKey,
      {
        candidates: [],
        exactMatch: false,
        ambiguous: false,
        error: 'مش لاقيين لاعب بالاسم ده في الأرشيف الكروي. اتأكد من كتابة الاسم صح أو العب به في سرك.',
        errorCode: 'PLAYER_NOT_FOUND',
        canFallbackToDirectPlay: true,
        planB: {
          available: true,
          query: trimmedQuery,
          suggestedCandidate,
        },
      },
      60 * 1000
    );

    return res.status(404).json({
      candidates: [],
      exactMatch: false,
      ambiguous: false,
      error: 'مش لاقيين لاعب بالاسم ده في الأرشيف الكروي. اتأكد من كتابة الاسم صح أو العب به في سرك.',
      errorCode: 'PLAYER_NOT_FOUND',
      canFallbackToDirectPlay: true,
      planB: {
        available: true,
        query: trimmedQuery,
        suggestedCandidate,
      },
    });
  } catch (err: unknown) {
    console.error('Error in /api/search-player:', err);
    return res.status(500).json({
      error: 'حصل عطل تقني مؤقت أثناء البحث. جرب تاني أو كمّل كلاعب في سرك.',
      errorCode: 'SERVER_ERROR',
      canFallbackToDirectPlay: true,
      planB: {
        available: true,
        query: trimmedQuery,
        suggestedCandidate: {
          id: `direct-${Date.now()}`,
          name: trimmedQuery || 'لاعب مختار',
          displayName: trimmedQuery || 'لاعب مختار',
          nationality: 'اختيار مباشر',
          position: 'لاعب كرة قدم',
          currentClubOrLast: 'في سرك 🤫',
          isRetired: false,
          eraOrNote: 'نمط اللعب المباشر — اللاعب في بالك',
        },
      },
    });
  }
});

// 2. Comprehensive Player Profile (local_db vs ai_knowledge vs unavailable)
app.post('/api/player-profile', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit('profile', clientIp, 20)) {
    return res.status(429).json({
      error: 'تجاوزت الحد المسموح لتحميل ملفات اللاعبين. استنى شوية وجرب تاني.',
      errorCode: 'RATE_LIMITED',
    });
  }

  try {
    const { playerName, displayName, nationality, mode = 'primary' } = req.body;
    if (!playerName && !displayName) {
      return res.status(400).json({ error: 'اسم اللاعب مطلوب' });
    }

    const searchTarget = (displayName || playerName || '').trim();
    const cleanPlayerName = (playerName || searchTarget).trim();
    const cleanDisplayName = (displayName || searchTarget).trim();
    const cacheKey = `${mode}:${normalizeSearch(searchTarget)}`;

    // Step 1: Check in-memory profile cache
    if (profileCache.has(cacheKey)) {
      return res.json({ profile: profileCache.get(cacheKey) });
    }

    // Step 2: Check local database
    const localPlayer =
      getBuiltinPlayerByIdOrName(cleanPlayerName) || getBuiltinPlayerByIdOrName(cleanDisplayName);
    if (localPlayer) {
      const normalizedLocal = normalizeProfile(
        {
          ...localPlayer,
          playerName: localPlayer.name,
          displayName: localPlayer.displayName,
          researchMode: 'local_db',
          sources: [
            { uri: 'https://www.transfermarkt.com', title: 'Transfermarkt Football Database' },
            { uri: 'https://en.wikipedia.org', title: 'Official Career Records' },
          ],
        },
        { playerName: cleanPlayerName, displayName: cleanDisplayName }
      );

      profileCache.set(cacheKey, normalizedLocal, 7 * 24 * 60 * 60 * 1000); // 7 days
      return res.json({ profile: normalizedLocal });
    }

    // Step 3: Build profile using Gemini
    if (isAnyGeminiAvailable()) {
      const ai = getAiClient();
      const isAiKnowledgeMode = mode === 'ai_knowledge';

      const prompt = `أنت صانع ألعاب ومحلل كروي أول للعبة "مين اللاعب؟" المصرية.
اللاعب المطلوب هو: "${searchTarget}" (${cleanPlayerName}) - الجنسية: ${nationality || 'غير محددة'}.
نمط الإجابة: ${isAiKnowledgeMode ? 'معلومات الـ AI المباشرة' : 'معلومات كروية مفصلة'}.

المطلوب:
بناء ملف كروي شامل ومفصل عن هذا اللاعب مقسم إلى 6 أقسام بدقة عالية:
- استخدم معلوماتك الكروية ذات الثقة العالية. لا تخترع أو تخمن أي معلومة مجهولة. إذا كانت معلومة مجهولة أو غير مؤكدة، اترك الحقل فارغاً.
- ممنوع نهائياً توليد أي أسئلة أو تلميحات أو Clues أو ألغاز. المطلوب فقط ملف اللاعب الكامل.

أعد النتيجة بصيغة JSON فقط بهذا الهيكل الدقيق:
{
  "profile": {
    "playerName": "${cleanPlayerName}",
    "displayName": "${cleanDisplayName}",
    "aliases": ["ألقاب أو أسماء شائعة له"],
    "nationality": "الجنسية بالعربي",
    "birthDate": "تاريخ الميلاد (مثال: 15 يونيو 1992)",
    "shirtNumber": "رقم القميص المشهور به",
    "position": "المركز الأساسي بالعربي",
    "isRetired": boolean,
    "currentClub": "النادي الحالي (فارغ لو معتزل)",
    "lastClub": "آخر نادي لعب له إذا معتزل أو النادي الحالي",
    "clubs": ["جميع الأندية بالترتيب الزمني"],
    "leagues": ["الدوريات التي لعب فيها"],
    "transfers": ["أبرز محطات الانتقال"],
    "careerTimeline": ["خط زمني للمحطات الكروية"],
    "nationalTeam": "اسم المنتخب",
    "internationalCaps": "عدد المباريات الدولية",
    "internationalGoals": "عدد الأهداف الدولية",
    "internationalTournaments": ["البطولات الدولية التي شارك فيها"],
    "leagueTitles": ["ألقاب الدوريات التي فاز بها"],
    "cups": ["الكؤوس المحلية التي حققها"],
    "internationalTrophies": ["البطولات القارية والدولية"],
    "individualAwards": ["الجوائز الفردية"],
    "trophies": ["قائمة شاملة بجميع البطولات الكبرى"],
    "appearances": "إجمالي المباريات التقريبية",
    "goals": "إجمالي الأهداف",
    "assists": "إجمالي الأسيست",
    "keyStats": ["إحصائيات بارزة ومؤكدة"],
    "careerFacts": ["حقائق موجزة عن مسيرته"],
    "notableTeammates": ["أسماء أبرز زملائه في الأندية والمنتخب"],
    "notableManagers": ["أسماء أبرز المدربين الذين لعب تحت قيادتهم"],
    "importantMatches": ["مباريات أو نهائيات تاريخية شهيرة"],
    "verifiedFacts": ["معلومات وحقائق كروية مهمة"]
  }
}`;

      const modelsToTry = GEMINI_MODELS.filter(isModelAvailable);
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const data = extractJson(response.text || '');
          if (data && data.profile) {
            data.profile.researchMode = 'ai_knowledge';
            data.profile.sources = [];

            const normalized = normalizeProfile(data.profile, {
              playerName: cleanPlayerName,
              displayName: cleanDisplayName,
            });

            profileCache.set(cacheKey, normalized, 7 * 24 * 60 * 60 * 1000); // 7 days
            return res.json({ profile: normalized });
          }
        } catch (geminiError: any) {
          handleModelError(model, geminiError);
        }
      }
    }

    // Step 4: Unavailable Profile when Gemini fails and not in DB
    const targetId = String(req.body.id || req.body.playerId || '');
    const indexPlayer = PLAYERS_INDEX.find(
      (p) =>
        (targetId && p.id === targetId) ||
        p.id === cleanPlayerName ||
        p.name === cleanPlayerName ||
        p.displayName === cleanDisplayName ||
        p.aliases.includes(cleanDisplayName)
    );

    const unavailableProfile = createUnavailableProfile({
      playerName: indexPlayer ? indexPlayer.name : cleanPlayerName,
      displayName: indexPlayer ? indexPlayer.displayName : cleanDisplayName,
      nationality: indexPlayer ? indexPlayer.nationality : nationality,
      position: indexPlayer ? indexPlayer.position : undefined,
      isRetired: indexPlayer ? indexPlayer.isRetired : undefined,
      aliases: indexPlayer ? indexPlayer.aliases : undefined,
    });

    profileCache.set(cacheKey, unavailableProfile, 60 * 1000); // 60s cache
    return res.json({ profile: unavailableProfile });
  } catch (err: unknown) {
    console.error('Error in /api/player-profile:', err);
    return res.status(500).json({
      error: 'حصلت مشكلة وإحنا بنجهز معلومات اللاعب. جرب تاني.',
    });
  }
});

// 3. Round Picker AI Assistant
app.post('/api/ai-assistant', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit('assistant', clientIp, 20)) {
    return res.status(429).json({
      error: 'تجاوزت الحد المسموح من الأسئلة. استنى لحظة وجرب تاني.',
      errorCode: 'RATE_LIMITED',
    });
  }

  try {
    const { playerProfile, question, history } = req.body;
    if (!playerProfile || !question || typeof question !== 'string') {
      return res.status(400).json({ error: 'السؤال ومعلومات اللاعب مطلوبة' });
    }

    const trimmedQuestion = question.trim().slice(0, 200);
    if (!trimmedQuestion) {
      return res.status(400).json({ error: 'السؤال لا يمكن أن يكون فارغاً' });
    }

    const displayName = playerProfile.displayName || playerProfile.playerName || '';
    const isSecretUnnamed =
      playerProfile.isCustomOrSecret &&
      (displayName === 'لاعب في السر' || displayName === 'لاعب مختار' || !displayName);

    if (isSecretUnnamed) {
      return res.json({
        answer: 'مفيش لاعب محدد عشان أساعدك — جاوب من معلوماتك 😉',
      });
    }

    if (isAnyGeminiAvailable()) {
      const ai = getAiClient();
      const isLocalDb = playerProfile.researchMode === 'local_db';

      const clubsSummary = Array.isArray(playerProfile.clubs) ? playerProfile.clubs.slice(0, 6).join('، ') : '';
      const trophiesSummary = Array.isArray(playerProfile.trophies) ? playerProfile.trophies.slice(0, 6).join('، ') : '';

      const systemPrompt = `أنت المساعد الذكي السري لصاحب الجولة في لعبة "مين اللاعب؟" الكروية المصرية.
صاحب الجولة هو الوحيد الذي يعرف هوية اللاعب:
اللاعب هو: ${displayName} (${playerProfile.playerName || displayName})
الجنسية: ${playerProfile.nationality || 'غير محددة'}
المركز: ${playerProfile.position || 'لاعب كرة قدم'}
الأندية: ${clubsSummary || 'أندية محترفة'}
البطولات: ${trophiesSummary || 'ألقاب متنوعة'}
الحالة: ${playerProfile.isRetired ? 'معتزل' : 'لاعب حالي'}
النادي: ${playerProfile.currentClub || playerProfile.lastClub || ''}
مصدر البيانات: ${isLocalDb ? 'قاعدة بيانات اللعبة' : 'معلومات الـ AI'}

مهمتك وإرشاداتك الصارمة:
1. الإجابة على سؤال صاحب الجولة باللهجة المصرية العامية الطبيعية والموجزة (جملة أو جملتين كحد أقصى).
2. صاحب الجولة يستشيرك ليتأكد من إجابة أسئلة أصدقائه في اللعبة الواقعية.
3. التزم بالدقة الكروية التامة. لا تخترع أو تلفق أي إجابة.
4. إذا لم تكن متأكداً تماماً من معلومة، قل: "مش متأكد من النقطة دي بصراحة، راجع معلوماتك."
5. تحدث بأسلوب مصري ودود ومباشر (مثلاً: "أيوه لعب في إسبانيا مع برشلونة"، "لأ ماخدش دوري الأبطال خالص").`;

      const chatContents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        {
          role: 'model',
          parts: [{ text: 'تمام، أنا معاك وفي سرك، جاهز أجاوبك على أي سؤال بخصوص اللاعب بدقة.' }],
        },
      ];

      if (Array.isArray(history)) {
        history.slice(-4).forEach((h: any) => {
          if (h && typeof h.text === 'string') {
            if (h.sender === 'user') {
              chatContents.push({ role: 'user', parts: [{ text: h.text.slice(0, 200) }] });
            } else if (h.sender === 'ai') {
              chatContents.push({ role: 'model', parts: [{ text: h.text.slice(0, 400) }] });
            }
          }
        });
      }

      chatContents.push({ role: 'user', parts: [{ text: trimmedQuestion }] });

      const modelsToTry = GEMINI_MODELS.filter(isModelAvailable);
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: chatContents as any,
          });

          const reply = response.text?.trim();
          if (reply) {
            return res.json({ answer: reply });
          }
        } catch (geminiError: any) {
          handleModelError(model, geminiError);
        }
      }
    }

    // Fallback: Local rule-based assistant
    const localReply = generateLocalAssistantReply(playerProfile, trimmedQuestion);
    return res.json({ answer: localReply });
  } catch (err: unknown) {
    console.error('Error in /api/ai-assistant:', err);
    return res.status(500).json({
      error: 'الـAI مش قادر يرد دلوقتي.',
    });
  }
});

// Process-level unhandled exception handlers
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [Server] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ [Server] Uncaught Exception:', err);
});

// Vite middleware setup
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
