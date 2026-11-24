import { GoogleGenAI } from '@google/genai';
import {
  searchBuiltinPlayers,
  getBuiltinPlayerByIdOrName,
  generateLocalAssistantReply,
  normalizeSearch,
  stripAl,
  editDistance,
  FAMOUS_PLAYERS_DB,
  StoredPlayer,
  searchFuzzy,
} from './playerDatabase.js';
import { PLAYERS_INDEX, searchPlayersIndex } from './playersIndex.js';
import { normalizeProfile, createUnavailableProfile } from './profileUtils.js';
import {
  callGroq,
  isAnyGroqAvailable,
  resetGroqCooldowns,
  getLastAiError,
  setLastAiError,
  classifyAiError,
  sanitizeLogMessage,
} from './groqClient.js';
import {
  canonicalizeQuery,
  buildCanonicalNameKey,
  buildEnglishTransliterationVariants,
  computeContextMatchScore,
  normalizeBasicText,
  canonicalTokenKey,
  extractQueryContext,
} from './nameCanonicalizer.js';

export { buildEnglishTransliterationVariants, canonicalizeQuery };

/**
 * NOTE FOR SERVERLESS (Vercel):
 * In-memory caches (`searchCache`, `profileCache`), `rateLimitStores`, and `modelCooldowns`
 * are best-effort per warm function instance on Vercel rather than a global distributed guarantee.
 * Cleanup happens lazily during handler invocations (no module-level setInterval timers).
 */

export const MAX_JSON_BODY_BYTES = 50 * 1024; // 50kb

export function applySecurityHeaders(res: any): void {
  if (!res || typeof res.setHeader !== 'function') return;
  // AI Studio preview iframe friendly: NO X-Frame-Options or frame-ancestors
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
}

export async function parseJsonBodySafe(
  req: any,
  maxBytes: number = MAX_JSON_BODY_BYTES
): Promise<{ ok: true; body: any } | { ok: false; status: number; error: string }> {
  const rawContentLength = req?.headers?.['content-length'];
  if (rawContentLength !== undefined) {
    const contentLength = Number(rawContentLength);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      return { ok: false, status: 413, error: 'حجم الطلب كبير جداً (Payload Too Large)' };
    }
  }

  let existingBody: any;
  try {
    existingBody = req?.body;
  } catch {
    return { ok: false, status: 400, error: 'طلب غير صالح (Invalid JSON)' };
  }

  if (existingBody !== undefined) {
    if (typeof existingBody === 'string') {
      if (Buffer.byteLength(existingBody, 'utf8') > maxBytes) {
        return { ok: false, status: 413, error: 'حجم الطلب كبير جداً (Payload Too Large)' };
      }
      const trimmed = existingBody.trim();
      if (!trimmed) {
        return { ok: true, body: {} };
      }
      try {
        return { ok: true, body: JSON.parse(trimmed) };
      } catch {
        return { ok: false, status: 400, error: 'طلب غير صالح (Invalid JSON)' };
      }
    }

    if (Buffer.isBuffer(existingBody)) {
      if (existingBody.length > maxBytes) {
        return { ok: false, status: 413, error: 'حجم الطلب كبير جداً (Payload Too Large)' };
      }
      const text = existingBody.toString('utf8').trim();
      if (!text) {
        return { ok: true, body: {} };
      }
      try {
        return { ok: true, body: JSON.parse(text) };
      } catch {
        return { ok: false, status: 400, error: 'طلب غير صالح (Invalid JSON)' };
      }
    }

    if (typeof existingBody === 'object' && existingBody !== null) {
      try {
        const serializedSize = Buffer.byteLength(JSON.stringify(existingBody), 'utf8');
        if (serializedSize > maxBytes) {
          return { ok: false, status: 413, error: 'حجم الطلب كبير جداً (Payload Too Large)' };
        }
      } catch {
        return { ok: false, status: 400, error: 'طلب غير صالح (Invalid JSON)' };
      }
      return { ok: true, body: existingBody };
    }

    return { ok: true, body: existingBody };
  }

  if (!req || typeof req.on !== 'function' || req.readableEnded) {
    return { ok: true, body: {} };
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let settled = false;

    const finish = (result: { ok: true; body: any } | { ok: false; status: number; error: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    req.on('data', (chunk: Buffer | string) => {
      if (settled) return;
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        req.destroy?.();
        finish({ ok: false, status: 413, error: 'حجم الطلب كبير جداً (Payload Too Large)' });
        return;
      }
      chunks.push(buf);
    });

    req.on('end', () => {
      if (settled) return;
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        finish({ ok: true, body: {} });
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        finish({ ok: true, body: parsed });
      } catch {
        finish({ ok: false, status: 400, error: 'طلب غير صالح (Invalid JSON)' });
      }
    });

    req.on('error', () => {
      finish({ ok: false, status: 400, error: 'طلب غير صالح (Invalid JSON)' });
    });
  });
}

function getClientIp(req: any): string {
  if (typeof req?.ip === 'string' && req.ip) {
    return req.ip;
  }
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && typeof forwarded[0] === 'string') {
    return forwarded[0].split(',')[0].trim();
  }
  const realIp = req?.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return req?.socket?.remoteAddress || 'unknown';
}

// In-memory Rate Limiting (Fixed 60s Window, best-effort per instance)
interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStores = {
  search: new Map<string, RateLimitBucket>(),
  profile: new Map<string, RateLimitBucket>(),
  assistant: new Map<string, RateLimitBucket>(),
};

let lastRateLimitCleanup = 0;

function cleanupExpiredRateLimits(now: number): void {
  if (now - lastRateLimitCleanup < 60 * 1000) return;
  lastRateLimitCleanup = now;
  for (const store of Object.values(rateLimitStores)) {
    for (const [ip, bucket] of store.entries()) {
      if (now > bucket.resetAt) {
        store.delete(ip);
      }
    }
  }
}

function checkRateLimit(type: 'search' | 'profile' | 'assistant', ip: string, maxRequests: number): boolean {
  const now = Date.now();
  cleanupExpiredRateLimits(now);

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

// TTL-based Caches with size limit (max 500 entries, lazy cleanup)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TtlCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private maxEntries: number;
  private lastCleanup = 0;

  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
  }

  private lazyCleanup(now = Date.now()): void {
    if (now - this.lastCleanup < 60 * 1000) return;
    this.cleanup(now);
  }

  get(key: string): T | undefined {
    const now = Date.now();
    this.lazyCleanup(now);
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (now > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.data;
  }

  set(key: string, data: T, ttlMs: number): void {
    const now = Date.now();
    this.lazyCleanup(now);
    if (this.map.size >= this.maxEntries) {
      this.cleanup(now);
    }
    if (this.map.size >= this.maxEntries) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey) this.map.delete(oldestKey);
    }
    this.map.set(key, { data, expiresAt: now + ttlMs });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  get size(): number {
    this.lazyCleanup();
    return this.map.size;
  }

  cleanup(now = Date.now()): void {
    this.lastCleanup = now;
    for (const [key, entry] of this.map.entries()) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
      }
    }
  }
}

const searchCache = new TtlCache<any>(2000);
const profileCache = new TtlCache<any>(2000);

// Gemini Client and Model Availability Management
let aiClient: GoogleGenAI | null = null;
let aiClientKey: string | undefined;
const modelCooldowns: Record<string, number> = {};

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

function getGeminiModels(): string[] {
  return process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(',').map((m) => m.trim()).filter(Boolean)
    : ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
}

function isModelAvailable(model: string): boolean {
  if (!getApiKey()) return false;
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
  return Boolean(getApiKey()) && getGeminiModels().some(isModelAvailable);
}

function getAiClient(): GoogleGenAI {
  const apiKey = getApiKey() || '';
  if (!aiClient || aiClientKey !== apiKey) {
    aiClientKey = apiKey;
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface WikipediaExtractResult {
  title: string;
  rawTitle?: string;
  extract: string;
  url: string;
  lang: 'ar' | 'en';
  pageId?: string | number;
  description?: string;
}

const REJECTED_WIKI_TITLE_PATTERNS: RegExp[] = [
  /\b(19|20)\d{2}[–\-/]\d{2,4}\b/, // season ranges like 2026–27, 2025/26
  /^\s*(list of|lists of)\b/i,
  /^\s*قائمة(\s|$)/,
  /\bin\s+[\w\s-]+\s+football\b/i,
  /\bfootball\s+in\b/i,
  /كرة\s+القدم\s+في/,
  /\bseason\b/i,
  /موسم/,
  /الدوري/,
  /\b(premier\s+league|la\s+liga|serie\s+a|bundesliga|ligue\s+1|champions\s+league|world\s+cup)\b/i,
  /\((disambiguation|توضيح)\)/i,
  /^(category|تصنيف|template|قالب|wikipedia|ويكيبيديا|portal|بوابة):/i,
  /^\s*(نادي|منتخب|المنتخب)\s+/,
  /\b(f\.?c\.?|s\.?c\.?|c\.?f\.?|a\.?f\.?c\.?|football\s+club|sporting\s+club|national(\s+under-\d+)?\s+(football|soccer)\s+team)\b/i,
];

const REJECTED_WIKI_DESCRIPTION_PATTERNS: RegExp[] = [
  /\b(football\s+club|sports\s+club|sporting\s+club|national(\s+under-\d+)?\s+(football|soccer)\s+team|football\s+league|football\s+season|football\s+competition|football\s+tournament|wikimedia\s+disambiguation|wikimedia\s+list)\b/i,
  /(نادي\s+رياضي|نادي\s+كرة\s+قدم|منتخب\s+وطني|موسم\s+رياضي|بطولة\s+كرة\s+قدم|صفحة\s+توضيح|قائمة\s+ويكيميديا)/,
];

const ACCEPTED_FOOTBALLER_PHRASES = [
  'footballer',
  'association football',
  'football player',
  'soccer player',
  'لاعب كرة قدم',
  'لاعبة كرة قدم',
];

export function isRejectedWikipediaTitle(title: string): boolean {
  const clean = String(title || '').trim();
  if (!clean) return true;
  if (REJECTED_WIKI_TITLE_PATTERNS.some((pattern) => pattern.test(clean))) {
    return true;
  }
  // Reject standalone 4-digit years unless part of a person's "(..., born YYYY)" or "(مواليد YYYY)" disambiguator
  const withoutBirthParen = clean
    .replace(/\((?:[^()]*,\s*)?(?:born|مواليد)\s+(?:19|20)\d{2}[^()]*\)/gi, '')
    .trim();
  return /\b(19|20)\d{2}\b/.test(withoutBirthParen);
}

function getFirstSentence(text: string): string {
  const clean = String(text || '').trim();
  if (!clean) return '';
  const match = clean.match(/^[^\n.!؟]+[.!؟]?/);
  return (match ? match[0] : clean.slice(0, 250)).trim();
}

export function isValidFootballerSummary(summary: any, fallbackTitle?: string): boolean {
  if (!summary || typeof summary !== 'object') return false;
  if (summary.type === 'disambiguation') return false;

  const titleToCheck = String(summary.title || fallbackTitle || '');
  if (isRejectedWikipediaTitle(titleToCheck)) return false;

  const description = String(summary.description || '').trim().toLowerCase();
  if (REJECTED_WIKI_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(description))) {
    return false;
  }

  if (description) {
    return ACCEPTED_FOOTBALLER_PHRASES.some((phrase) => description.includes(phrase));
  }

  const firstSentence = getFirstSentence(String(summary.extract || '')).toLowerCase();
  return ACCEPTED_FOOTBALLER_PHRASES.some((phrase) => firstSentence.includes(phrase));
}

const COMMON_FIRST_NAME_SKELETONS = new Set([
  'mhmd', // محمد / محمود / Mohamed / Mahmoud
  'ahmd', // أحمد / Ahmed
  'al',   // علي / Ali
  'amr',  // عمر / Omar / عمرو
  'hsn',  // حسن / حسين / Hassan / Hussein
  'mstf', // مصطفى / Mostafa
  'abrh', // إبراهيم / Ibrahim
  'kld',  // خالد / Khaled
  'Kld',  // خالد / Khaled
  'ysf',  // يوسف / Youssef
]);

function normalizeNameTokens(raw: string): string[] {
  const withoutParens = String(raw || '').replace(/\s*\([^)]*\)/g, ' ');
  let normalized = normalizeSearch(withoutParens);
  if (!normalized) return [];

  normalized = normalized
    .replace(/(^|\s)abd\s*(?:al|el)\s+/g, '$1abdel')
    .replace(/(^|\s)abdel\s+/g, '$1abdel')
    .replace(/(^|\s)عبد\s*(?:ال)?/g, '$1عبد')
    .replace(/(^|\s)(?:el|al)\s+/g, '$1');

  normalized = stripAl(normalized);

  return normalized
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function toPhoneticSkeleton(token: string): string {
  const clean = token.trim();
  if (!clean) return '';

  const isArabic = /[\u0600-\u06FF]/.test(clean);
  if (isArabic) {
    let out = '';
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (i === 0 && (ch === 'ا' || ch === 'ع')) {
        out += 'a';
        continue;
      }
      if (i === 0 && ch === 'و') {
        out += 'w';
        continue;
      }
      if (i === 0 && ch === 'ي') {
        out += 'y';
        continue;
      }
      switch (ch) {
        case 'ا':
        case 'ع':
        case 'و':
        case 'ي':
          break;
        case 'ب':
          out += 'b';
          break;
        case 'ت':
        case 'ط':
          out += 't';
          break;
        case 'ث':
        case 'س':
        case 'ص':
          out += 's';
          break;
        case 'ج':
          out += 'g';
          break;
        case 'ح':
        case 'ه':
          out += 'h';
          break;
        case 'خ':
          out += 'K';
          break;
        case 'د':
        case 'ض':
          out += 'd';
          break;
        case 'ذ':
        case 'ز':
        case 'ظ':
          out += 'z';
          break;
        case 'ر':
          out += 'r';
          break;
        case 'ش':
          out += 'S';
          break;
        case 'غ':
          out += 'G';
          break;
        case 'ف':
          out += 'f';
          break;
        case 'ق':
        case 'ك':
          out += 'k';
          break;
        case 'ل':
          out += 'l';
          break;
        case 'م':
          out += 'm';
          break;
        case 'ن':
          out += 'n';
          break;
        default:
          break;
      }
    }
    return out.replace(/(.)\1+/g, '$1');
  }

  let latin = clean.toLowerCase();
  const hasLeadingVowel = /^[aeiou]/.test(latin);
  latin = latin
    .replace(/^abd(?:el|al)/, 'abd')
    .replace(/ph/g, 'f')
    .replace(/sh|ch/g, 'S')
    .replace(/kh/g, 'K')
    .replace(/gh/g, 'G')
    .replace(/ou/g, 'u')
    .replace(/ee|ie|ei/g, 'i')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/j/g, 'g')
    .replace(/p/g, 'b')
    .replace(/v/g, 'f');

  let out = hasLeadingVowel ? 'a' : '';
  for (let i = 0; i < latin.length; i++) {
    const ch = latin[i];
    if (i === 0 && (ch === 'w' || ch === 'y')) {
      out += ch;
      continue;
    }
    if ('aeiouwy'.includes(ch)) continue;
    if (/[a-zA-Z]/.test(ch)) {
      out += ch;
    }
  }
  return out.replace(/(.)\1+/g, '$1');
}

function playerTokensMatch(tokA: string, tokB: string): boolean {
  if (!tokA || !tokB) return false;
  if (tokA === tokB) return true;

  if (canonicalTokenKey(tokA) === canonicalTokenKey(tokB)) {
    return true;
  }

  const isArA = /[\u0600-\u06FF]/.test(tokA);
  const isArB = /[\u0600-\u06FF]/.test(tokB);

  // Same Arabic script: allow minimal typo tolerance only for longer tokens
  if (isArA && isArB) {
    const minLen = Math.min(tokA.length, tokB.length);
    if (minLen >= 5) {
      return editDistance(tokA, tokB, 1) <= 1;
    }
    return false;
  }

  const skelA = toPhoneticSkeleton(tokA);
  const skelB = toPhoneticSkeleton(tokB);
  if (!skelA || !skelB) return false;
  if (skelA === skelB) return true;

  const minSkelLen = Math.min(skelA.length, skelB.length);
  if (minSkelLen >= 5 && skelA[0] === skelB[0]) {
    return editDistance(skelA, skelB, 1) <= 1;
  }
  return false;
}

export function doesWikipediaTitleMatchPlayer(
  pageTitle: string,
  requestedNames: string[]
): boolean {
  const titleTokens = normalizeNameTokens(pageTitle);
  if (titleTokens.length === 0) return false;
  const joinedTitleSkel = titleTokens.map(toPhoneticSkeleton).join('');

  for (const rawReq of requestedNames) {
    const reqTokens = normalizeNameTokens(rawReq);
    if (reqTokens.length === 0) continue;

    // Joined comparison handles compound names like "Aboutrika" vs "أبو تريكة"
    const joinedReqSkel = reqTokens.map(toPhoneticSkeleton).join('');
    if (
      joinedTitleSkel.length >= 5 &&
      joinedReqSkel.length >= 5 &&
      joinedTitleSkel === joinedReqSkel
    ) {
      return true;
    }

    const shorter = titleTokens.length <= reqTokens.length ? titleTokens : reqTokens;
    const longer = titleTokens.length <= reqTokens.length ? reqTokens : titleTokens;

    if (shorter.length === 1 && longer.length >= 2) {
      const singleSkel = toPhoneticSkeleton(shorter[0]);
      if (COMMON_FIRST_NAME_SKELETONS.has(singleSkel)) {
        continue;
      }
    }

    const usedIndices = new Set<number>();
    let allMatched = true;
    for (const sTok of shorter) {
      let matchedIndex = -1;
      for (let i = 0; i < longer.length; i++) {
        if (usedIndices.has(i)) continue;
        if (playerTokensMatch(sTok, longer[i])) {
          matchedIndex = i;
          break;
        }
      }
      if (matchedIndex === -1) {
        allMatched = false;
        break;
      }
      usedIndices.add(matchedIndex);
    }

    if (allMatched) {
      return true;
    }
  }

  return false;
}

const WIKI_USER_AGENT = 'La3eebFootballGame/2.0 (https://la3eeb.app)';
const wikiQueryCache = new TtlCache<WikipediaExtractResult[]>(300);

async function fetchWikipediaSummary(lang: 'ar' | 'en', rawTitle: string): Promise<any | null> {
  try {
    const slug = encodeURIComponent(rawTitle.trim().replace(/ /g, '_'));
    const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${slug}`;
    const res = await fetch(summaryUrl, {
      headers: { 'User-Agent': WIKI_USER_AGENT },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchValidatedWikipediaByLang(
  lang: 'ar' | 'en',
  searchQuery: string,
  withFullExtract: boolean,
  matchNames: string[],
  maxResults = 1
): Promise<WikipediaExtractResult[]> {
  const wikiCacheKey = `${lang}:${withFullExtract ? 'full' : 'sum'}:${maxResults}:${normalizeBasicText(searchQuery)}`;
  const cached = wikiQueryCache.get(wikiCacheKey);
  if (cached) {
    return cached.filter((item) => doesWikipediaTitleMatchPlayer(item.rawTitle || item.title, matchNames));
  }

  try {
    const suffix = lang === 'ar' ? ' لاعب كرة قدم' : ' footballer';
    const srLimit = maxResults > 1 ? 8 : 5;
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      searchQuery + suffix
    )}&srlimit=${srLimit}&utf8=&format=json`;

    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': WIKI_USER_AGENT },
      signal: AbortSignal.timeout(3500),
    });
    if (!searchRes.ok) return [];

    const searchData: any = await searchRes.json();
    const items = searchData?.query?.search;
    if (!Array.isArray(items) || items.length === 0) return [];

    const candidateItems = items
      .filter(
        (item: any) =>
          item &&
          item.title &&
          !isRejectedWikipediaTitle(String(item.title)) &&
          doesWikipediaTitleMatchPlayer(String(item.title), matchNames)
      )
      .slice(0, maxResults > 1 ? 6 : 3);

    if (candidateItems.length === 0) return [];

    const summaries = await Promise.all(
      candidateItems.map((item: any) => fetchWikipediaSummary(lang, String(item.title).trim()))
    );

    const results: WikipediaExtractResult[] = [];
    const seenPageIds = new Set<string>();

    for (let idx = 0; idx < candidateItems.length; idx++) {
      if (results.length >= maxResults) break;

      const item = candidateItems[idx];
      const rawTitle = String(item.title).trim();
      const summary = summaries[idx];
      if (!isValidFootballerSummary(summary, rawTitle)) {
        continue;
      }

      const resolvedTitle = String(summary.title || rawTitle);
      if (!doesWikipediaTitleMatchPlayer(resolvedTitle, matchNames)) {
        continue;
      }

      const pageIdKey = String(summary.pageid || item.pageid || resolvedTitle);
      if (seenPageIds.has(pageIdKey)) continue;
      seenPageIds.add(pageIdKey);

      const cleanTitle = resolvedTitle
        .replace(/\s*\(لاعب كرة قدم.*?\)/gi, '')
        .replace(/\s*\(footballer.*?\)/gi, '')
        .trim();

      let extractText = typeof summary.extract === 'string' ? summary.extract.trim() : '';
      let pageUrl =
        typeof summary?.content_urls?.desktop?.page === 'string' &&
        (summary.content_urls.desktop.page.startsWith('https://') ||
          summary.content_urls.desktop.page.startsWith('http://'))
          ? summary.content_urls.desktop.page
          : `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`;

      if (withFullExtract && item.pageid) {
        try {
          const extractUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&exchars=3000&pageids=${encodeURIComponent(
            String(item.pageid)
          )}&format=json`;
          const extractRes = await fetch(extractUrl, {
            headers: { 'User-Agent': 'La3eebFootballGame/2.0' },
            signal: AbortSignal.timeout(3500),
          });
          if (extractRes.ok) {
            const extractData: any = await extractRes.json();
            const page = extractData?.query?.pages?.[String(item.pageid)];
            const fullExtract = typeof page?.extract === 'string' ? page.extract.trim() : '';
            if (fullExtract.length > extractText.length) {
              extractText = fullExtract;
            }
            if (
              typeof page?.fullurl === 'string' &&
              (page.fullurl.startsWith('https://') || page.fullurl.startsWith('http://'))
            ) {
              pageUrl = page.fullurl;
            }
          }
        } catch {
          // Keep REST summary extract if full extract fails
        }
      }

      if (!extractText) continue;

      results.push({
        title: cleanTitle,
        rawTitle: resolvedTitle,
        extract: extractText.slice(0, 3000),
        url: pageUrl,
        lang,
        pageId: summary.pageid || item.pageid,
        description: typeof summary.description === 'string' ? summary.description : undefined,
      });
    }

    if (results.length > 0) {
      wikiQueryCache.set(wikiCacheKey, results, 10 * 60 * 1000);
    }
    return results;
  } catch (err) {
    console.warn(
      `Wikipedia (${lang}) search error or timeout:`,
      err instanceof Error ? err.message : 'Unknown error'
    );
    return [];
  }
}

export async function fetchWikipediaExtract(
  query: string,
  englishName?: string,
  extraMatchNames: string[] = []
): Promise<WikipediaExtractResult | null> {
  const cleanPrimary = query.trim();
  if (!cleanPrimary) return null;

  const qPrimary = canonicalizeQuery(cleanPrimary);
  const enQuery = englishName && englishName.trim() ? englishName.trim() : cleanPrimary;
  const qEn = canonicalizeQuery(enQuery);

  const matchNames = Array.from(
    new Set(
      [
        cleanPrimary,
        enQuery,
        ...extraMatchNames,
        ...qPrimary.allMatchNames,
        ...qEn.allMatchNames,
      ]
        .map((n) => n.trim())
        .filter(Boolean)
    )
  );

  const arTerms = Array.from(new Set([cleanPrimary, ...qPrimary.arSearchQueries, ...qEn.arSearchQueries]));
  for (const arTerm of arTerms.slice(0, 2)) {
    const arResults = await fetchValidatedWikipediaByLang('ar', arTerm, true, matchNames, 1);
    if (arResults.length > 0) return arResults[0];
  }

  const enTerms = Array.from(new Set([enQuery, ...qPrimary.enSearchQueries, ...qEn.enSearchQueries]));
  for (const enTerm of enTerms.slice(0, 2)) {
    const enResults = await fetchValidatedWikipediaByLang('en', enTerm, true, matchNames, 1);
    if (enResults.length > 0) return enResults[0];
  }

  return null;
}

const WIKI_NATIONALITY_MAP: Array<[RegExp, string]> = [
  [/\begyptian\b|مصري(?:ة)?/i, 'مصر'],
  [/\bsaudi(?:\s+arabian)?\b|سعودي(?:ة)?/i, 'السعودية'],
  [/\bmoroccan\b|مغربي(?:ة)?/i, 'المغرب'],
  [/\balgerian\b|جزائري(?:ة)?/i, 'الجزائر'],
  [/\btunisian\b|تونسي(?:ة)?/i, 'تونس'],
  [/\bfrench\b|فرنسي(?:ة)?/i, 'فرنسا'],
  [/\bbrazilian\b|برازيلي(?:ة)?/i, 'البرازيل'],
  [/\bargentine(?:an)?\b|أرجنتيني(?:ة)?|ارجنتيني(?:ة)?/i, 'الأرجنتين'],
  [/\bspanish\b|إسباني(?:ة)?|اسباني(?:ة)?/i, 'إسبانيا'],
  [/\benglish\b|\bbritish\b|إنجليزي(?:ة)?|انجليزي(?:ة)?/i, 'إنجلترا'],
  [/\bportuguese\b|برتغالي(?:ة)?/i, 'البرتغال'],
  [/\bgerman\b|ألماني(?:ة)?|الماني(?:ة)?/i, 'ألمانيا'],
  [/\bitalian\b|إيطالي(?:ة)?|ايطالي(?:ة)?/i, 'إيطاليا'],
  [/\bdutch\b|هولندي(?:ة)?/i, 'هولندا'],
  [/\bbelgian\b|بلجيكي(?:ة)?/i, 'بلجيكا'],
  [/\bnigerian\b|نيجيري(?:ة)?/i, 'نيجيريا'],
  [/\bsenegalese\b|سنغالي(?:ة)?/i, 'السنغال'],
  [/\bghanaian\b|غاني(?:ة)?/i, 'غانا'],
  [/\bivorian\b|إيفواري(?:ة)?|ايفواري(?:ة)?/i, 'ساحل العاج'],
  [/\bcroatian\b|كرواتي(?:ة)?/i, 'كرواتيا'],
  [/\buruguayan\b|أوروجوياني(?:ة)?|أوروغواياني(?:ة)?/i, 'أوروجواي'],
  [/\bcolombian\b|كولومبي(?:ة)?/i, 'كولومبيا'],
  [/\bqatari\b|قطري(?:ة)?/i, 'قطر'],
  [/\bemirati\b|إماراتي(?:ة)?|اماراتي(?:ة)?/i, 'الإمارات'],
  [/\biraqi\b|عراقي(?:ة)?/i, 'العراق'],
  [/\bjordanian\b|أردني(?:ة)?|اردني(?:ة)?/i, 'الأردن'],
  [/\bsyrian\b|سوري(?:ة)?/i, 'سوريا'],
  [/\blebanese\b|لبناني(?:ة)?/i, 'لبنان'],
  [/\bpalestinian\b|فلسطيني(?:ة)?/i, 'فلسطين'],
  [/\bsudanese\b|سوداني(?:ة)?/i, 'السودان'],
  [/\blibyan\b|ليبي(?:ة)?/i, 'ليبيا'],
  [/\bnorwegian\b|نرويجي(?:ة)?/i, 'النرويج'],
  [/\bpolish\b|بولندي(?:ة)?/i, 'بولندا'],
  [/\bswedish\b|سويدي(?:ة)?/i, 'السويد'],
  [/\bturkish\b|تركي(?:ة)?/i, 'تركيا'],
];

function extractNationalityFromWiki(text: string): string {
  if (!text) return '';
  let bestIdx = Infinity;
  let bestLabel = '';
  for (const [pattern, label] of WIKI_NATIONALITY_MAP) {
    const idx = text.search(pattern);
    if (idx !== -1 && idx < bestIdx) {
      bestIdx = idx;
      bestLabel = label;
    }
  }
  return bestLabel;
}

function extractPositionFromWiki(text: string): string {
  const lower = text.toLowerCase();
  if (/حارس(\s+مرمى)?|\bgoalkeeper\b/.test(lower)) return 'حارس مرمى';
  if (/مدافع|ظهير|قلب\s+دفاع|\bdefender\b|\bfull-?back\b|\bcentre-?back\b|\bcenter-?back\b/.test(lower)) {
    return 'مدافع';
  }
  if (/لاعب\s+وسط|خط\s+(?:ال)?وسط|\bmidfielder\b/.test(lower)) return 'لاعب وسط';
  if (/جناح|\bwinger\b/.test(lower)) return 'جناح';
  if (/مهاجم|رأس\s+حربة|خط\s+الهجوم|\bstriker\b|\bforward\b/.test(lower)) return 'مهاجم';
  return '';
}

function extractClubFromWiki(text: string): string {
  const enMatch = text.match(
    /\b(?:currently\s+plays|plays|played)\s+(?:as\s+(?:a|an)\s+[^.]{1,40}?\s+)?for\s+(?:the\s+)?([A-Z0-9][A-Za-z0-9\s.'’&-]{1,40}?)(?=\s*(?:[.,;(\[]|\band\b|\bin\b|\bon\b|\bof\s+the\b|$))/
  );
  if (enMatch && enMatch[1]) {
    const club = enMatch[1].trim();
    if (!/\b(national|olympic|under-\d+|team)\b/i.test(club)) {
      return club;
    }
  }

  const arMatch = text.match(
    /(?:يلعب|لعب)(?:\s+حالياً|\s+حاليًا)?\s+(?:في\s+مركز\s+[^\s،.]+\s+|ك[^\s،.]{2,25}\s+)?(?:مع|في|لصالح)\s+((?:نادي\s+)?[\u0600-\u06FF0-9A-Za-z\s-]{2,40}?)(?=\s*(?:[،.,(\[]|$)|\s+(?:في|منذ|و|حيث|كلاعب|المنافس)(?=\s|$))/
  );
  if (arMatch && arMatch[1]) {
    const club = arMatch[1].trim();
    if (!/^(?:ال)?(?:منتخب|جناح|مهاجم|مدافع|وسط|خط|حارس|ظهير|قلب|رأس|مركز|دوري|بطولة)(?=\s|$)/.test(club)) {
      return club;
    }
  }

  return '';
}

function extractBirthYearFromWiki(wiki: WikipediaExtractResult): string {
  const sourceText = `${wiki.rawTitle || ''} ${wiki.description || ''} ${wiki.extract || ''}`;
  const match = sourceText.match(
    /(?:born|مواليد|ولد(?:\s+في)?)\s*(?:\d{1,2}\s+[^\d\n()]{2,20}\s+|[^\d\n()]{0,25})((?:19|20)\d{2})/i
  );
  return match ? match[1] : '';
}

function extractIsRetiredFromWiki(headText: string): boolean | undefined {
  const lowerHead = headText.toLowerCase();
  if (/(?:\bformer\b|\bretired\b|سابق|معتزل|اعتزل|كان\s+يلعب)/.test(lowerHead)) {
    return true;
  }
  if (/(?:\bplays\b|\bcurrent\b|يلعب\s+حال|يلعب\s+في|يلعب\s+لصالح|يلعب\s+مع|هو\s+لاعب)/.test(lowerHead)) {
    return false;
  }
  return undefined;
}

function buildWikipediaCandidate(wiki: WikipediaExtractResult) {
  const headText = `${wiki.description || ''} ${getFirstSentence(wiki.extract || '')}`;
  const isRetired = extractIsRetiredFromWiki(headText);

  const nationality = extractNationalityFromWiki(headText);
  const position = extractPositionFromWiki(headText);
  const currentClubOrLast = extractClubFromWiki(getFirstSentence(wiki.extract || '') || headText);
  const birthYear = extractBirthYearFromWiki(wiki);

  const eraParts: string[] = [];
  if (birthYear) eraParts.push(`مواليد ${birthYear}`);
  if (isRetired === true) eraParts.push('معتزل');
  else if (isRetired === false) eraParts.push('لاعب حالي');

  return {
    id: 'wiki-' + (wiki.pageId ? String(wiki.pageId) : encodeURIComponent(wiki.rawTitle || wiki.title).slice(0, 32)),
    name: wiki.title,
    displayName: wiki.title,
    nationality,
    position,
    currentClubOrLast,
    ...(typeof isRetired === 'boolean' ? { isRetired } : {}),
    eraOrNote: eraParts.join(' • '),
    _sourceUrl: wiki.url,
    _birthYear: birthYear,
  };
}

function hasDefiniteAlMarker(token: string): boolean {
  const norm = normalizeSearch(token);
  if (!norm) return false;
  if (/[\u0600-\u06FF]/.test(norm)) {
    return norm.startsWith('ال') && norm.length > 3;
  }
  return /^(?:al|el)-?/i.test(norm);
}

function doLastNamesConflictOnDefiniteArticle(nameA: string, nameB: string): boolean {
  const prep = (raw: string) =>
    normalizeSearch(String(raw || '').replace(/\s*\([^)]*\)/g, ' '))
      .replace(/(^|\s)(?:al|el)\s+([a-z]+)/gi, '$1el-$2')
      .split(/\s+/)
      .filter(Boolean);

  const rawTokensA = prep(nameA);
  const rawTokensB = prep(nameB);
  if (rawTokensA.length < 2 || rawTokensB.length < 2) return false;

  const lastA = rawTokensA[rawTokensA.length - 1];
  const lastB = rawTokensB[rawTokensB.length - 1];
  const strippedA = stripAl(lastA).replace(/^(?:al|el)-?/i, '');
  const strippedB = stripAl(lastB).replace(/^(?:al|el)-?/i, '');
  if (!playerTokensMatch(strippedA, strippedB)) return false;

  return hasDefiniteAlMarker(lastA) !== hasDefiniteAlMarker(lastB);
}

function normalizeWikiUrl(url?: string): string {
  if (!url) return '';
  try {
    return decodeURIComponent(url).trim().toLowerCase().replace(/\/+$/, '');
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '');
  }
}

function doClubsMatch(clubA: string, clubB: string): boolean {
  const normA = normalizeBasicText(clubA)
    .replace(/\b(?:fc|sc|cf|club|نادي)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const normB = normalizeBasicText(clubB)
    .replace(/\b(?:fc|sc|cf|club|نادي)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normA || !normB) return false;
  if (normA === normB || normA.includes(normB) || normB.includes(normA)) return true;

  const expA = extractQueryContext(normA).contextExpansions;
  const expB = extractQueryContext(normB).contextExpansions;
  if (expA.length > 0 && expB.length > 0) {
    const setB = new Set(expB.map((e) => normalizeBasicText(e)));
    if (expA.some((e) => setB.has(normalizeBasicText(e)))) return true;
  }

  const keyA = buildCanonicalNameKey(normA).canonicalKey;
  const keyB = buildCanonicalNameKey(normB).canonicalKey;
  return Boolean(keyA && keyB && keyA === keyB);
}

export async function fetchValidatedWikipediaCandidates(
  query: string,
  maxPerLang = 4
): Promise<WikipediaExtractResult[]> {
  const qInfo = canonicalizeQuery(query);
  const cleanQuery = (qInfo.nameQuery || qInfo.rawQuery).trim();
  if (!cleanQuery) return [];

  const matchNames = qInfo.allMatchNames.length > 0 ? qInfo.allMatchNames : [cleanQuery];
  const arSearchTerms = Array.from(new Set(qInfo.arSearchQueries)).slice(0, 2);
  const enSearchTerms = Array.from(new Set(qInfo.enSearchQueries)).slice(0, 6);

  const [arVariantResults, enVariantResults] = await Promise.all([
    Promise.all(
      arSearchTerms.map((arTerm) =>
        fetchValidatedWikipediaByLang('ar', arTerm, false, matchNames, maxPerLang)
      )
    ),
    Promise.all(
      enSearchTerms.map((enTerm) =>
        fetchValidatedWikipediaByLang('en', enTerm, false, matchNames, maxPerLang)
      )
    ),
  ]);

  const allMatches = [...arVariantResults.flat(), ...enVariantResults.flat()];
  const combined: WikipediaExtractResult[] = [];
  const seenPageKeys = new Set<string>();
  const seenUrls = new Set<string>();

  for (const item of allMatches) {
    const pid = item.pageId
      ? `${item.lang}:${item.pageId}`
      : `${item.lang}:${item.rawTitle || item.title}`;
    const normUrl = normalizeWikiUrl(item.url);

    if (seenPageKeys.has(pid) || (normUrl && seenUrls.has(normUrl))) {
      continue;
    }

    const itemBirth = extractBirthYearFromWiki(item);
    const itemHead = `${item.description || ''} ${getFirstSentence(item.extract || '')}`;
    const itemClub = extractClubFromWiki(getFirstSentence(item.extract || '') || itemHead);
    const itemNat = extractNationalityFromWiki(itemHead);
    const itemRetired = extractIsRetiredFromWiki(itemHead);
    const itemCanon = buildCanonicalNameKey(item.title).canonicalKey;

    const existingMatch = combined.find((existing) => {
      if (existing.pageId && item.pageId && existing.lang === item.lang && String(existing.pageId) === String(item.pageId)) {
        return true;
      }
      if (normUrl && normalizeWikiUrl(existing.url) === normUrl) {
        return true;
      }

      const exCanon = buildCanonicalNameKey(existing.title).canonicalKey;
      const sameTitleOrCanon =
        (exCanon && itemCanon && exCanon === itemCanon) ||
        doesWikipediaTitleMatchPlayer(existing.title, [item.title]);
      if (!sameTitleOrCanon) return false;

      if (doLastNamesConflictOnDefiniteArticle(existing.title, item.title)) {
        return false;
      }

      const exHead = `${existing.description || ''} ${getFirstSentence(existing.extract || '')}`;
      const exNat = extractNationalityFromWiki(exHead);
      if (exNat && itemNat && exNat !== itemNat) return false;

      const exBirth = extractBirthYearFromWiki(existing);
      if (exBirth && itemBirth && exBirth !== itemBirth) return false;

      const exRetired = extractIsRetiredFromWiki(exHead);
      if (typeof exRetired === 'boolean' && typeof itemRetired === 'boolean' && exRetired !== itemRetired) {
        return false;
      }

      // Same birth year + non-conflicting nationality/retired => definitely same person across ar/en, even if club records differ!
      if (exBirth && itemBirth && exBirth === itemBirth) {
        return true;
      }

      const exClub = extractClubFromWiki(getFirstSentence(existing.extract || '') || exHead);
      if (exClub && itemClub && !doClubsMatch(exClub, itemClub)) {
        return false;
      }

      return Boolean(
        existing.lang === item.lang ||
          (exNat && itemNat && exNat === itemNat) ||
          (exClub && itemClub && doClubsMatch(exClub, itemClub))
      );
    });

    seenPageKeys.add(pid);
    if (normUrl) seenUrls.add(normUrl);

    if (!existingMatch) {
      combined.push(item);
    } else if (existingMatch.extract.length < item.extract.length && !existingMatch.description && item.description) {
      // Preserve richer context if first entry was sparse
      existingMatch.description = item.description;
    }
  }

  return combined;
}

// Fallback search using free Wikipedia API (returns multiple strict footballer candidates across ar + en)
export async function searchWikipediaPlayers(query: string): Promise<any[]> {
  const results = await fetchValidatedWikipediaCandidates(query, 4);
  const qInfo = canonicalizeQuery(query);
  const candidates: InternalCandidate[] = results.map((w, idx) => ({
    ...buildWikipediaCandidate(w),
    _sourceTier: 2,
    _priority: 45 - idx,
    _contextScore: computeContextMatchScore([w.rawTitle, w.description, w.extract], qInfo.contextExpansions),
  }));
  return mergeCandidatesList(
    candidates,
    qInfo.nameQuery || qInfo.rawQuery,
    qInfo.enSearchQueries,
    qInfo.contextExpansions
  ).map(toPublicCandidate);
}

// Single-result wrapper preserved for compatibility
export async function searchWikipediaPlayer(query: string): Promise<any | null> {
  const candidates = await searchWikipediaPlayers(query);
  return candidates[0] || null;
}

// Helper to extract JSON from AI text safely
export function extractJson(text: string): any {
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

export function _resetServerStateForTests(): void {
  searchCache.cleanup(Date.now() + 365 * 24 * 60 * 60 * 1000);
  profileCache.cleanup(Date.now() + 365 * 24 * 60 * 60 * 1000);
  wikiQueryCache.cleanup(Date.now() + 365 * 24 * 60 * 60 * 1000);
  for (const store of Object.values(rateLimitStores)) {
    store.clear();
  }
  for (const key of Object.keys(modelCooldowns)) {
    delete modelCooldowns[key];
  }
  resetGroqCooldowns();
}

// Health check handler
export function healthHandler(_req: any, res: any) {
  searchCache.cleanup();
  profileCache.cleanup();
  const groqAvailable = isAnyGroqAvailable();
  const geminiAvailable = isAnyGeminiAvailable();
  const aiProvider: 'groq' | 'gemini' | 'none' = groqAvailable
    ? 'groq'
    : geminiAvailable
    ? 'gemini'
    : 'none';
  const aiAvailable = groqAvailable || geminiAvailable;

  return res.json({
    status: 'ok',
    aiProvider,
    aiAvailable,
    geminiAvailable,
    lastAiError: getLastAiError(),
    dbPlayersCount: FAMOUS_PLAYERS_DB.length,
    indexPlayersCount: PLAYERS_INDEX.length,
    cachedSearches: searchCache.size,
    cachedProfiles: profileCache.size,
    timestamp: new Date().toISOString(),
  });
}

const COMMON_FIRST_NAMES_SET = new Set([
  // Arabic normalized
  'محمد', 'محمود', 'احمد', 'علي', 'عمر', 'عمرو', 'حسن', 'حسين', 'مصطفي',
  'ابراهيم', 'خالد', 'يوسف', 'طارق', 'كريم', 'حسام', 'وليد', 'ياسر', 'اسامه',
  'هشام', 'ايمن', 'رامي', 'هاني', 'تامر', 'اسلام', 'سعيد', 'سعد', 'عادل',
  'سمير', 'نبيل', 'جمال', 'كمال', 'ناصر', 'فهد', 'سالم', 'سلمان', 'عبدالله',
  'عبدالرحمن', 'عبدالعزيز', 'عبدالكريم', 'شريف', 'باسم', 'مروان', 'اكرم',
  'حمزه', 'زياد', 'مازن', 'بلال', 'انس', 'سيف',
  // Latin normalized
  'mohamed', 'mohammed', 'muhammad', 'mohammad', 'mahmoud', 'mahmud',
  'ahmed', 'ahmad', 'ali', 'omar', 'amr', 'hassan', 'hasan', 'hussein', 'hussain',
  'mostafa', 'mustafa', 'ibrahim', 'khaled', 'khalid', 'youssef', 'yusuf',
  'tarek', 'tareq', 'karim', 'kareem', 'hossam', 'walid', 'waleed', 'yasser',
  'osama', 'hesham', 'ayman', 'rami', 'hany', 'hani', 'tamer', 'islam',
  'saeed', 'saad', 'adel', 'samir', 'nabil', 'gamal', 'jamal', 'kamal',
  'nasser', 'fahad', 'salem', 'salman', 'abdullah', 'abdallah', 'abdelrahman',
  'abdulrahman', 'abdelaziz', 'sherif', 'shereef', 'bassem', 'marwan', 'akram',
  'hamza', 'ziad', 'mazen', 'bilal', 'anas', 'seif', 'saif',
  'john', 'david', 'carlos', 'luis', 'lucas', 'daniel', 'marco', 'mario',
  'alex', 'paul', 'kevin', 'juan', 'pedro', 'jose', 'antonio', 'fernando',
  'gabriel', 'bruno', 'diego', 'sergio', 'manuel', 'cristian', 'martin',
  'robert', 'thomas', 'james', 'michael',
]);

export function isTooGenericPlayerQuery(rawQuery: string): boolean {
  // Fuse compound Arabic/Latin given names BEFORE stripAl (otherwise "الله" becomes "لله")
  let norm = normalizeSearch(rawQuery)
    .replace(/(^|\s)عبد\s+(الله|الرحمن|العزيز|الكريم)(?=\s|$)/g, '$1عبد$2')
    .replace(/(^|\s)abd\s+(?:el|al)\s+(rahman|aziz|kader|allah)(?=\s|$)/g, '$1abdel$2');

  norm = stripAl(norm).trim();
  if (!norm || norm.length < 2) return true;

  const tokens = norm.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  if (tokens.length === 1) {
    return COMMON_FIRST_NAMES_SET.has(tokens[0]);
  }

  // Repeated identical tokens (e.g., "محمد محمد", "أحمد أحمد", "mohamed mohamed")
  if (new Set(tokens).size === 1) {
    return true;
  }

  return false;
}

const PLACEHOLDER_CANDIDATE_VALUES = new Set([
  'غير متاح',
  'غير معروف',
  'غير محدد',
  'دولي',
  'نادي محترف',
  'لاعب كرة قدم',
  'unknown',
  'n/a',
  'na',
  'none',
  'tbd',
  '-',
]);

function cleanCandidateField(val: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim().slice(0, 120);
  if (!trimmed) return '';
  if (PLACEHOLDER_CANDIDATE_VALUES.has(trimmed.toLowerCase())) return '';
  return trimmed;
}

interface InternalCandidate {
  id: string;
  name: string;
  displayName: string;
  nationality: string;
  position: string;
  currentClubOrLast: string;
  isRetired?: boolean;
  eraOrNote?: string;
  _sourceTier: 4 | 3 | 2 | 1; // 4: local_db, 3: local_index, 2: wikipedia, 1: ai
  _priority: number;
  _sourceUrl?: string;
  _birthYear?: string;
  _contextScore?: number;
}

function toPublicCandidate(c: InternalCandidate) {
  return {
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    nationality: c.nationality,
    position: c.position,
    currentClubOrLast: c.currentClubOrLast,
    ...(typeof c.isRetired === 'boolean' ? { isRetired: c.isRetired } : {}),
    ...(c.eraOrNote ? { eraOrNote: c.eraOrNote } : {}),
  };
}

function isClearExactLocalMatch(
  player: { id: string; name: string; displayName: string; aliases?: string[] },
  rawQuery: string
): boolean {
  const normQ = stripAl(normalizeSearch(rawQuery));
  if (!normQ) return false;
  const normDN = stripAl(normalizeSearch(player.displayName));
  const normN = stripAl(normalizeSearch(player.name));
  const normId = normalizeSearch(player.id);

  if (normDN === normQ || normN === normQ || normId === normQ) {
    return true;
  }

  const qCanon = buildCanonicalNameKey(rawQuery).canonicalKey;
  if (
    qCanon &&
    !doLastNamesConflictOnDefiniteArticle(player.displayName || player.name, rawQuery) &&
    (buildCanonicalNameKey(player.displayName).canonicalKey === qCanon ||
      buildCanonicalNameKey(player.name).canonicalKey === qCanon)
  ) {
    return true;
  }

  if (Array.isArray(player.aliases)) {
    return player.aliases.some(
      (a) =>
        stripAl(normalizeSearch(a)) === normQ ||
        (qCanon && buildCanonicalNameKey(a).canonicalKey === qCanon)
    );
  }
  return false;
}

function isExactFullNameMatch(
  player: { id: string; name: string; displayName: string },
  rawQuery: string
): boolean {
  const normQ = stripAl(normalizeSearch(rawQuery));
  if (!normQ) return false;
  const normDN = stripAl(normalizeSearch(player.displayName));
  const normN = stripAl(normalizeSearch(player.name));
  const normId = normalizeSearch(player.id);
  if (normDN === normQ || normN === normQ || normId === normQ) return true;

  const qCanon = buildCanonicalNameKey(rawQuery).canonicalKey;
  if (!qCanon) return false;
  if (doLastNamesConflictOnDefiniteArticle(player.displayName || player.name, rawQuery)) {
    return false;
  }
  return (
    buildCanonicalNameKey(player.displayName).canonicalKey === qCanon ||
    buildCanonicalNameKey(player.name).canonicalKey === qCanon
  );
}

function extractFourDigitYear(text?: string): string {
  if (!text) return '';
  const m = text.match(/\b((?:19|20)\d{2})\b/);
  return m ? m[1] : '';
}

function computeCandidateExactTokenScore(
  cand: { name: string; displayName: string },
  rawQuery: string,
  enVariants: string[]
): number {
  const qNorm = normalizeSearch(rawQuery);
  if (!qNorm) return 1;
  const qTokens = qNorm.split(/\s+/).filter(Boolean);
  const qCanon = buildCanonicalNameKey(rawQuery).canonicalKey;

  const dnNorm = normalizeSearch(cand.displayName || '').replace(/\s*\([^)]*\)/g, '').trim();
  const enNorm = normalizeSearch(cand.name || '').replace(/\s*\([^)]*\)/g, '').trim();
  const dnTokens = dnNorm.split(/\s+/).filter(Boolean);
  const enTokens = enNorm.split(/\s+/).filter(Boolean);

  // Definite-article mismatch (e.g. "محمد الشريف" vs "محمد شريف") is close spelling, never exact
  const hasDefiniteConflict =
    doLastNamesConflictOnDefiniteArticle(cand.displayName || '', rawQuery) ||
    doLastNamesConflictOnDefiniteArticle(cand.name || '', rawQuery);
  if (hasDefiniteConflict) {
    return 2;
  }

  // Exact full match preserving definite article "ال"
  if ((dnNorm && dnNorm === qNorm) || (enNorm && enNorm === qNorm)) {
    return 3;
  }

  // Canonical full name equivalence across Arabic/English scripts (e.g. "Ahmed Fathy" <-> "أحمد فتحي")
  if (qCanon) {
    const dnCanon = buildCanonicalNameKey(cand.displayName || '').canonicalKey;
    const enCanon = buildCanonicalNameKey(cand.name || '').canonicalKey;
    if (dnCanon === qCanon || enCanon === qCanon) {
      return 3;
    }
  }

  // All query tokens appear verbatim in Arabic displayName (preserving "ال")
  if (
    qTokens.length > 0 &&
    dnTokens.length >= qTokens.length &&
    qTokens.every((qt) => dnTokens.includes(qt))
  ) {
    return 3;
  }

  // Exact match against any primary transliterated English variant
  for (const variant of enVariants) {
    const vNorm = normalizeSearch(variant);
    if (!vNorm) continue;
    if (enNorm === vNorm || dnNorm === vNorm) return 3;
    const vTokens = vNorm.split(/\s+/).filter(Boolean);
    if (
      vTokens.length > 0 &&
      enTokens.length >= vTokens.length &&
      vTokens.every((vt) => enTokens.includes(vt))
    ) {
      return 3;
    }
  }

  // Close spelling / definite-article variant
  const qNoAl = stripAl(qNorm);
  if (
    stripAl(dnNorm) === qNoAl ||
    stripAl(dnNorm).includes(qNoAl) ||
    doesWikipediaTitleMatchPlayer(cand.displayName || cand.name, [rawQuery, ...enVariants])
  ) {
    return 2;
  }

  return 1;
}

export function wikiTitleFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/wiki/')[1] || '';
    return decodeURIComponent(seg).replace(/_/g, ' ').trim();
  } catch {
    return '';
  }
}

export function mergeCandidatesList(
  items: InternalCandidate[],
  rawQuery = '',
  enVariants: string[] = [],
  contextExpansions: string[] = []
): InternalCandidate[] {
  const hasContext = contextExpansions.length > 0;
  const sorted = [...items].sort((a, b) => {
    if (b._sourceTier !== a._sourceTier) return b._sourceTier - a._sourceTier;

    if (hasContext) {
      const ctxA = a._contextScore ?? 0;
      const ctxB = b._contextScore ?? 0;
      if (ctxB !== ctxA) return ctxB - ctxA;
    }

    if (rawQuery) {
      const exactA = computeCandidateExactTokenScore(a, rawQuery, enVariants);
      const exactB = computeCandidateExactTokenScore(b, rawQuery, enVariants);
      if (exactB !== exactA) return exactB - exactA;
    }

    if (b._priority !== a._priority) return b._priority - a._priority;
    const scoreDetails = (c: InternalCandidate) =>
      (c.currentClubOrLast ? 2 : 0) + (c.nationality ? 1 : 0) + (c.position ? 1 : 0);
    return scoreDetails(b) - scoreDetails(a);
  });

  const merged: InternalCandidate[] = [];
  for (const cand of sorted) {
    const candYear = cand._birthYear || extractFourDigitYear(cand.eraOrNote);
    const candClub = cand.currentClubOrLast || '';
    const candNat = normalizeSearch(cand.nationality);
    const candNameNorm = normalizeSearch(cand.displayName || cand.name);
    const candEnNorm = normalizeSearch(cand.name || cand.displayName);
    const candCanon = buildCanonicalNameKey(cand.displayName || cand.name).canonicalKey;
    const candEnCanon = buildCanonicalNameKey(cand.name || cand.displayName).canonicalKey;
    const candTokens = normalizeNameTokens(cand.displayName || cand.name);
    const candUrl = normalizeWikiUrl(cand._sourceUrl);

    const existing = merged.find((m) => {
      if (m.id && cand.id && m.id === cand.id) return true;
      const mUrl = normalizeWikiUrl(m._sourceUrl);
      if (mUrl && candUrl && mUrl === candUrl) return true;

      if (
        typeof m.isRetired === 'boolean' &&
        typeof cand.isRetired === 'boolean' &&
        m.isRetired !== cand.isRetired
      ) {
        return false;
      }

      const mNat = normalizeSearch(m.nationality);
      if (mNat && candNat && mNat !== candNat) return false;

      const mYear = m._birthYear || extractFourDigitYear(m.eraOrNote);
      if (mYear && candYear && mYear !== candYear) return false;

      if (
        doLastNamesConflictOnDefiniteArticle(m.displayName || m.name, cand.displayName || cand.name)
      ) {
        return false;
      }

      const mNameNorm = normalizeSearch(m.displayName || m.name);
      const mEnNorm = normalizeSearch(m.name || m.displayName);
      const mCanon = buildCanonicalNameKey(m.displayName || m.name).canonicalKey;
      const mEnCanon = buildCanonicalNameKey(m.name || m.displayName).canonicalKey;

      const sameCanonical = Boolean(
        (mCanon && (mCanon === candCanon || mCanon === candEnCanon)) ||
          (mEnCanon && (mEnCanon === candCanon || mEnCanon === candEnCanon))
      );

      const sameExactString = Boolean(
        (mNameNorm && candNameNorm && mNameNorm === candNameNorm) ||
          (mEnNorm && candEnNorm && mEnNorm === candEnNorm)
      );

      const mTokens = normalizeNameTokens(m.displayName || m.name);
      const sameTokenLenAndTitle =
        mTokens.length > 0 &&
        candTokens.length > 0 &&
        mTokens.length === candTokens.length &&
        (doesWikipediaTitleMatchPlayer(m.name || m.displayName, [cand.name, cand.displayName].filter(Boolean)) ||
          doesWikipediaTitleMatchPlayer(m.displayName || m.name, [cand.name, cand.displayName].filter(Boolean)));

      if (!sameExactString && !sameCanonical && !sameTokenLenAndTitle) {
        return false;
      }

      // Identity safety: a shared name, nationality or birth year is NOT proof of the same person,
      // and an unverified AI stub with unknown fields must not hide a distinct person.
      // Merge only on corroborating person-specific attributes: nationality known and equal on both
      // sides, plus a known current/last club on both sides that matches. Same id or the same
      // Wikipedia URL merged earlier. Everything else stays separate so the user picks explicitly.
      // Two different known source pages are two different source identities (e.g. same-name teammates).
      if (mUrl && candUrl && mUrl !== candUrl) return false;
      const mClub = m.currentClubOrLast || '';
      if (mNat && candNat && mNat === candNat && mClub && candClub && doClubsMatch(mClub, candClub)) {
        return true;
      }
      return false;
    });

    if (existing) {
      // Prefer Arabic displayName and Latin name when available from merged sources
      if (!/[\u0600-\u06FF]/.test(existing.displayName) && /[\u0600-\u06FF]/.test(cand.displayName)) {
        existing.displayName = cand.displayName;
      }
      if (!/[A-Za-z]/.test(existing.name) && /[A-Za-z]/.test(cand.name)) {
        existing.name = cand.name;
      }
      if (!existing.nationality && cand.nationality) existing.nationality = cand.nationality;
      if (!existing.position && cand.position) existing.position = cand.position;
      if (!existing.currentClubOrLast && cand.currentClubOrLast) {
        existing.currentClubOrLast = cand.currentClubOrLast;
      }
      if (typeof existing.isRetired !== 'boolean' && typeof cand.isRetired === 'boolean') {
        existing.isRetired = cand.isRetired;
      }
      if (!existing._birthYear && candYear) {
        existing._birthYear = candYear;
        if (!existing.eraOrNote || !existing.eraOrNote.includes(candYear)) {
          existing.eraOrNote = existing.eraOrNote
            ? `مواليد ${candYear} • ${existing.eraOrNote}`
            : `مواليد ${candYear}`;
        }
      } else if (!existing.eraOrNote && cand.eraOrNote) {
        existing.eraOrNote = cand.eraOrNote;
      }
      if ((cand._contextScore ?? 0) > (existing._contextScore ?? 0)) {
        existing._contextScore = cand._contextScore;
      }
    } else {
      merged.push({ ...cand });
    }
  }

  // Re-sort after merging so enriched candidates with context matches or fuller details bubble up properly within tier
  return merged.sort((a, b) => {
    if (hasContext) {
      const ctxA = a._contextScore ?? 0;
      const ctxB = b._contextScore ?? 0;
      if (ctxB !== ctxA) return ctxB - ctxA;
    }
    if (b._sourceTier !== a._sourceTier) return b._sourceTier - a._sourceTier;
    if (rawQuery) {
      const exactA = computeCandidateExactTokenScore(a, rawQuery, enVariants);
      const exactB = computeCandidateExactTokenScore(b, rawQuery, enVariants);
      if (exactB !== exactA) return exactB - exactA;
    }
    if (b._priority !== a._priority) return b._priority - a._priority;
    return 0;
  });
}

// 1. Search player handler (POST only, handles rate limit, cache, local DB/index, Gemini/Groq, and Wikipedia)
export async function searchPlayerHandler(req: any, res: any) {
  const clientIp = getClientIp(req);
  if (!checkRateLimit('search', clientIp, 40)) {
    return res.status(429).json({
      error: 'تجاوزت الحد المسموح من عمليات البحث. استنى شوية وجرب تاني.',
      errorCode: 'RATE_LIMITED',
    });
  }

  let trimmedQuery = '';
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const rawQuery = body.query;
    if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
      return res.status(400).json({ error: 'من فضلك اكتب اسم لاعب' });
    }

    trimmedQuery = rawQuery.trim();
    if (trimmedQuery.length > 60) {
      trimmedQuery = trimmedQuery.slice(0, 60).trim();
    }

    const qInfo = canonicalizeQuery(trimmedQuery);
    const searchName = qInfo.nameQuery.trim();
    const sortedContext = [...qInfo.contextExpansions].sort().join('|');
    const cacheKey = `${qInfo.canonicalKey || normalizeSearch(trimmedQuery)}::${sortedContext}`;

    const buildDirectPlanBCandidate = () => ({
      id: `direct-${Date.now()}`,
      name: trimmedQuery,
      displayName: trimmedQuery,
      nationality: '',
      position: '',
      currentClubOrLast: '',
      eraOrNote: 'لاعب غير مؤكد بالاسم المكتوب',
    });

    // Step 1: Check in-memory canonical search cache
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      const status = cached?.errorCode === 'PLAYER_NOT_FOUND' ? 404 : 200;
      if (cached && cached.planB) {
        return res.status(status).json({
          ...cached,
          planB: {
            ...cached.planB,
            query: trimmedQuery,
            suggestedCandidate: buildDirectPlanBCandidate(),
          },
        });
      }
      return res.status(status).json(cached);
    }

    // If user typed ONLY club/country/context words without a player name
    if (qInfo.hadContext && !searchName) {
      const notFoundPayload = {
        candidates: [],
        exactMatch: false,
        ambiguous: false,
        error: 'مش لاقيين لاعب بالاسم ده في الأرشيف الكروي. اتأكد من كتابة الاسم صح أو العب به في سرك.',
        errorCode: 'PLAYER_NOT_FOUND',
        canFallbackToDirectPlay: true,
        planB: {
          available: true,
          query: trimmedQuery,
          suggestedCandidate: buildDirectPlanBCandidate(),
        },
      };
      return res.status(404).json(notFoundPayload);
    }

    const effectiveNameQuery = searchName || trimmedQuery;

    // Step 1.5: Reject overly generic single common first names or repeated tokens (e.g. "محمد", "محمد محمد")
    if (isTooGenericPlayerQuery(effectiveNameQuery)) {
      const genericResponse = {
        candidates: [],
        exactMatch: false,
        ambiguous: true,
        tooGeneric: true,
        error:
          'الاسم ده عام جدًا ومش كفاية لتحديد لاعب. من فضلك حدد تقصد مين واكتب الاسم كامل أو أضف لقب اللاعب أو ناديه.',
        errorCode: 'TOO_GENERIC',
        canFallbackToDirectPlay: true,
        planB: {
          available: true,
          query: trimmedQuery,
          suggestedCandidate: buildDirectPlanBCandidate(),
        },
      };
      searchCache.set(cacheKey, genericResponse, 24 * 60 * 60 * 1000);
      return res.status(200).json(genericResponse);
    }

    // Step 2: Check BOTH local rich database AND lightweight players index together using name part
    const localMatches = searchBuiltinPlayers(effectiveNameQuery);
    const indexMatches = searchPlayersIndex(effectiveNameQuery);
    const enVariants = qInfo.enSearchQueries;

    const localDbCandidates: InternalCandidate[] = localMatches.map((p: StoredPlayer) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      nationality: cleanCandidateField(p.nationality),
      position: cleanCandidateField(p.position),
      currentClubOrLast: cleanCandidateField(
        p.currentClub || p.lastClub || (p.clubs && p.clubs.length > 0 ? p.clubs[p.clubs.length - 1] : '')
      ),
      isRetired: p.isRetired,
      eraOrNote: p.eraOrNote || (p.isRetired ? 'معتزل' : 'لاعب حالي'),
      _sourceTier: 4,
      _priority: isExactFullNameMatch(p, effectiveNameQuery) ? 100 : 80,
      _contextScore: computeContextMatchScore(
        [p.nationality, p.position, p.currentClub, p.lastClub, ...(p.clubs || []), ...(p.leagues || []), p.nationalTeam],
        qInfo.contextExpansions
      ),
    }));

    const localIndexCandidates: InternalCandidate[] = indexMatches.map((p) => ({
      id: p.id,
      name: p.name,
      displayName: p.displayName,
      nationality: cleanCandidateField(p.nationality),
      position: cleanCandidateField(p.position),
      currentClubOrLast: '', // Unknown in index — leave blank, do not guess
      isRetired: p.isRetired,
      eraOrNote: p.isRetired ? 'معتزل' : 'لاعب حالي',
      _sourceTier: 3,
      _priority: isExactFullNameMatch(p, effectiveNameQuery) ? 70 : 50,
      _contextScore: computeContextMatchScore(
        [p.nationality, p.position],
        qInfo.contextExpansions
      ),
    }));

    const combinedLocal = mergeCandidatesList(
      [...localDbCandidates, ...localIndexCandidates],
      effectiveNameQuery,
      enVariants,
      qInfo.contextExpansions
    );

    const exactLocalWinnerPool = [
      ...localMatches.filter((p) => isExactFullNameMatch(p, effectiveNameQuery)),
      ...indexMatches.filter((p) => isExactFullNameMatch(p, effectiveNameQuery)),
    ];

    // Fast-return ONLY when rich FAMOUS_PLAYERS_DB has a match (`localMatches.length >= 1`).
    // When matches come only from PLAYERS_INDEX (or none locally), always check Wikipedia + AI
    // so homonymous players (e.g., "أحمد حسن" / "أحمد فتحي") never skip web disambiguation.
    if (localMatches.length >= 1) {
      if (combinedLocal.length === 1) {
        const onlyPlayer = localMatches[0];
        if (isClearExactLocalMatch(onlyPlayer, effectiveNameQuery)) {
          const result = {
            exactMatch: true,
            ambiguous: false,
            candidates: [toPublicCandidate(combinedLocal[0])],
          };
          searchCache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
          return res.json(result);
        }
      } else if (combinedLocal.length > 1) {
        if (exactLocalWinnerPool.length === 1 && localMatches.some((p) => p.id === exactLocalWinnerPool[0].id)) {
          const winner = localDbCandidates.find((c) => c.id === exactLocalWinnerPool[0].id)!;
          const result = {
            exactMatch: true,
            ambiguous: false,
            candidates: [toPublicCandidate(winner)],
          };
          searchCache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
          return res.json(result);
        }

        const result = {
          exactMatch: false,
          ambiguous: true,
          candidates: combinedLocal.slice(0, 6).map(toPublicCandidate),
        };
        searchCache.set(cacheKey, result, 7 * 24 * 60 * 60 * 1000);
        return res.json(result);
      }
    }

    // Step 3: Fetch Web Wikipedia candidates + AI search (Groq primary -> Gemini fallback)
    let aiQuotaExhausted = false;
    let aiNetworkError = false;
    let aiExplicitNotFound = false;
    let aiAmbiguousFlag = false;
    const hasGeminiKey = Boolean(getApiKey());
    const groqReady = isAnyGroqAvailable();
    const geminiReady = isAnyGeminiAvailable();

    let wikiSources: WikipediaExtractResult[] = [];
    let wikiNetworkError = false;
    try {
      wikiSources = await fetchValidatedWikipediaCandidates(effectiveNameQuery, 4);
    } catch {
      wikiNetworkError = true;
    }

    const aiCandidates: InternalCandidate[] = [];

    if (groqReady || geminiReady) {
      const sourceBlock =
        wikiSources.length > 0
          ? `\nنتائج ويكيبيديا المتاحة:\n${wikiSources
              .slice(0, 3)
              .map((w, i) => `${i + 1}) ${w.rawTitle || w.title}: ${getFirstSentence(w.extract).slice(0, 300)}`)
              .join('\n')}\nاستخدمها مع معرفتك، ولو في أكثر من لاعب معروف بنفس الاسم اعرضهم كلهم، وأي تفصيلة مش متأكد منها سيبها "" (فارغة) ولا تخمن.`
          : '\nلو مفيش مصدر، اعتمد على معلوماتك للاعبي كرة القدم المعروفين بدقة شديدة، وأي حقل مش متأكد منه سيبه "" (فارغ) ولا تخمن.';

      const prompt = `أنت خبير كروي في لعبة "مين اللاعب؟". البحث عن: "${trimmedQuery}".${sourceBlock}
1. حدد لاعبي كرة القدم الحقيقيين المقصودين (بحد أقصى 5 لاعبين مع إعطاء الأولوية للاعبين المعروفين).
2. لو الاسم يطابق أو يحتمل أكثر من لاعب كرة قدم (خصوصاً الأسماء الثنائية الشائعة اللي بيشترك فيها أكتر من لاعب معروف في مصر أو الوطن العربي أو العالم)، اذكرهم كلهم واجعل exactMatch=false و ambiguous=true ولا تفترض لاعب واحد فقط.
3. لو اسم محدد للاعب واحد فقط دون غيره، اجعل exactMatch=true و ambiguous=false. لو مش لاعب حقيقي اجعل candidates=[].
4. لو أي تفصيلة غير معروفة (مثل النادي الحالي/الأخير أو الجنسية أو المركز أو الملاحظة)، اتركها "" فارغة ولا تخمن، واجعل isRetired null لو غير معروف.
أعد JSON فقط بهذا الشكل:
{"exactMatch":boolean,"ambiguous":boolean,"candidates":[{"id":"slug","name":"English Name","displayName":"الاسم بالعربي","nationality":"","position":"","currentClubOrLast":"","isRetired":false,"eraOrNote":""}]}`;

      const acceptAiData = (data: any) => {
        if (data && Array.isArray(data.candidates)) {
          if (data.candidates.length === 0) {
            aiExplicitNotFound = true;
            return true;
          }
          aiAmbiguousFlag = Boolean(data.ambiguous) || data.candidates.length > 1;
          data.candidates.slice(0, 5).forEach((c: any, idx: number) => {
            const dName = cleanCandidateField(c?.displayName || c?.name);
            const eName = cleanCandidateField(c?.name || c?.displayName);
            if (!dName && !eName) return;

            // Never accept an AI candidate that doesn't match the requested player name part
            const matchesNamePart =
              doesWikipediaTitleMatchPlayer(dName, qInfo.allMatchNames) ||
              doesWikipediaTitleMatchPlayer(eName, qInfo.allMatchNames);
            if (!matchesNamePart) return;

            aiCandidates.push({
              id: cleanCandidateField(c?.id) || `ai-${idx}-${encodeURIComponent(eName || dName).slice(0, 24)}`,
              name: eName || dName,
              displayName: dName || eName,
              // Never fill nationality, position, or club from AI memory in suggestions list
              nationality: '',
              position: '',
              currentClubOrLast: '',
              _sourceTier: 1,
              _priority: 20 - idx,
              _contextScore: 0,
            });
          });
          return true;
        }
        return false;
      };

      // Step 3A: Groq first
      if (groqReady) {
        const groqRes = await callGroq({
          fn: 'search',
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
          maxTokens: 700,
        });
        if (groqRes.ok && groqRes.text) {
          const data = extractJson(groqRes.text);
          if (!acceptAiData(data)) {
            console.warn(
              `[Groq Error] fn=search model=${groqRes.model || 'unknown'} status=200 type=parse_error code=invalid_json msg=Response was not valid candidates JSON`
            );
            setLastAiError('parse');
          }
        } else {
          if (groqRes.quotaExhausted) aiQuotaExhausted = true;
          if (groqRes.networkError) aiNetworkError = true;
        }
      }

      // Step 3B: Gemini fallback
      if (!aiExplicitNotFound && aiCandidates.length === 0 && geminiReady) {
        const ai = getAiClient();
        const modelsToTry = getGeminiModels().filter(isModelAvailable);
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
            if (acceptAiData(data)) {
              break;
            }
            console.warn(
              `[Gemini Error] fn=search model=${model} status=200 type=parse_error code=invalid_json msg=Response was not valid candidates JSON`
            );
            setLastAiError('parse');
          } catch (geminiError: any) {
            handleModelError(model, geminiError);
            const rawStatus = geminiError?.status ?? geminiError?.code;
            const numericStatus = typeof rawStatus === 'number' ? rawStatus : undefined;
            const stringCode = typeof rawStatus === 'string' ? rawStatus : undefined;
            const category = classifyAiError(numericStatus, stringCode, geminiError);
            setLastAiError(category);
            console.warn(
              `[Gemini Error] fn=search model=${model} status=${numericStatus ?? 0} category=${category} msg=${sanitizeLogMessage(geminiError?.message || 'Gemini request failed')}`
            );

            const errMsg = String(geminiError?.message || geminiError || '');
            if (
              category === 'rate_limit' ||
              rawStatus === 429 ||
              rawStatus === 'RESOURCE_EXHAUSTED' ||
              errMsg.includes('429') ||
              errMsg.includes('RESOURCE_EXHAUSTED') ||
              errMsg.includes('quota')
            ) {
              aiQuotaExhausted = true;
            } else if (
              category === 'timeout' ||
              errMsg.includes('fetch') ||
              errMsg.includes('network') ||
              errMsg.includes('ECONNREFUSED') ||
              errMsg.includes('timeout') ||
              errMsg.includes('ENOTFOUND')
            ) {
              aiNetworkError = true;
            }
          }
        }
      }
    } else if (hasGeminiKey) {
      aiQuotaExhausted = true;
    }

    // Step 4: Merge local + Wikipedia + AI candidates (prioritizing DB -> Index -> Wikipedia -> AI, context ranking, exact-token before close spelling)
    const wikiCandidates: InternalCandidate[] = wikiSources.map((w, idx) => ({
      ...buildWikipediaCandidate(w),
      _sourceTier: 2,
      _priority: 45 - idx,
      _contextScore: computeContextMatchScore(
        [w.rawTitle, w.description, w.extract],
        qInfo.contextExpansions
      ),
    }));

    const mergedAll = mergeCandidatesList(
      [...combinedLocal, ...wikiCandidates, ...aiCandidates],
      effectiveNameQuery,
      enVariants,
      qInfo.contextExpansions
    );

    if (mergedAll.length > 0) {
      const topCand = mergedAll[0];
      const topScore = computeCandidateExactTokenScore(topCand, effectiveNameQuery, enVariants);
      const topCanon = buildCanonicalNameKey(topCand.displayName || topCand.name).canonicalKey;
      const topEnCanon = buildCanonicalNameKey(topCand.name || topCand.displayName).canonicalKey;
      const matchesCanonicalFullName =
        Boolean(qInfo.canonicalKey) &&
        (topCanon === qInfo.canonicalKey || topEnCanon === qInfo.canonicalKey) &&
        !doLastNamesConflictOnDefiniteArticle(topCand.displayName || '', effectiveNameQuery) &&
        !doLastNamesConflictOnDefiniteArticle(topCand.name || '', effectiveNameQuery);

      // exactMatch=true ONLY when there is exactly 1 distinct person matching the normalized full name WITH source backing (_sourceTier >= 2)
      const isClearSingleSourceMatch =
        mergedAll.length === 1 &&
        topCand._sourceTier >= 2 &&
        !aiAmbiguousFlag &&
        (matchesCanonicalFullName || topScore >= 3);

      const finalResult = {
        exactMatch: isClearSingleSourceMatch,
        ambiguous: mergedAll.length > 1 || aiAmbiguousFlag || !isClearSingleSourceMatch,
        candidates: mergedAll.slice(0, 6).map(toPublicCandidate),
      };

      searchCache.set(cacheKey, finalResult, 24 * 60 * 60 * 1000);
      return res.json(finalResult);
    }

    // Step 4.5: Fuzzy typo fallback using ONLY the name part if exact local, web, and AI found nothing
    const fuzzyMatches = searchFuzzy(effectiveNameQuery, [...FAMOUS_PLAYERS_DB, ...PLAYERS_INDEX]);
    if (fuzzyMatches.length > 0) {
      const fuzzyCandidates = fuzzyMatches.slice(0, 4).map((p: any) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        nationality: cleanCandidateField(p.nationality),
        position: cleanCandidateField(p.position),
        currentClubOrLast: cleanCandidateField(
          p.currentClub ||
            p.lastClub ||
            (p.clubs && p.clubs.length > 0 ? p.clubs[p.clubs.length - 1] : '')
        ),
        isRetired: p.isRetired,
        eraOrNote: p.eraOrNote || (p.isRetired ? 'معتزل' : 'لاعب حالي'),
      }));

      const fuzzyResult = {
        exactMatch: false,
        ambiguous: fuzzyCandidates.length > 1,
        candidates: fuzzyCandidates,
      };
      searchCache.set(cacheKey, fuzzyResult, 24 * 60 * 60 * 1000);
      return res.json(fuzzyResult);
    }

    // Step 5: Suggested candidate for Plan B direct play
    const suggestedCandidate = buildDirectPlanBCandidate();

    if (aiQuotaExhausted) {
      return res.status(200).json({
        candidates: [],
        exactMatch: false,
        ambiguous: false,
        error: 'حصة البحث الذكي خلصت مؤقتًا. تقدر تعيد المحاولة بعد لحظات، أو تكمل وتلعب في سرك فوراً.',
        errorCode: 'QUOTA_EXHAUSTED',
        canFallbackToDirectPlay: true,
        planB: {
          available: true,
          query: trimmedQuery,
          suggestedCandidate,
        },
      });
    }

    if (aiNetworkError || wikiNetworkError) {
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
      cacheKey,
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
    console.error('Error in /api/search-player:', err instanceof Error ? err.message : 'Unknown error');
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
}

// 2. Comprehensive Player Profile (local_db vs ai_knowledge vs unavailable)
export async function playerProfileHandler(req: any, res: any) {
  const clientIp = getClientIp(req);
  if (!checkRateLimit('profile', clientIp, 20)) {
    return res.status(429).json({
      error: 'تجاوزت الحد المسموح لتحميل ملفات اللاعبين. استنى شوية وجرب تاني.',
      errorCode: 'RATE_LIMITED',
    });
  }

  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { playerName, displayName, nationality, mode = 'primary' } = body;
    if (!playerName && !displayName) {
      return res.status(400).json({ error: 'اسم اللاعب مطلوب' });
    }

    const searchTarget = String(displayName || playerName || '').trim();
    const cleanPlayerName = String(playerName || searchTarget).trim();
    const cleanDisplayName = String(displayName || searchTarget).trim();
    if (!cleanPlayerName && !cleanDisplayName) {
      return res.status(400).json({ error: 'اسم اللاعب مطلوب' });
    }
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

    // Step 3: Build profile using Wikipedia extract + Groq (primary) -> Gemini (fallback)
    const groqReady = isAnyGroqAvailable();
    const geminiReady = isAnyGeminiAvailable();

    if (groqReady || geminiReady) {
      const wikiSource = await fetchWikipediaExtract(searchTarget, cleanPlayerName, [
        cleanDisplayName,
      ]);
      const isAiKnowledgeMode = mode === 'ai_knowledge';

      const sourceInstructions = wikiSource
        ? `اعتمد على نص ويكيبيديا التالي كمصدر أساسي (${wikiSource.title}):\n${wikiSource.extract}\nأي معلومة مش موجودة في النص سيبها فاضية ("" أو [])، ممنوع التخمين أو الاختراع.`
        : `مفيش مصدر متاح حالياً. جاوب من معلوماتك الكروية بحذر شديد، وأي حقل مش متأكد منه بنسبة عالية سيبه فاضي تماماً ("" أو []) — ممنوع ملء الفراغات بتخمينات أو عبارات عامة.`;

      const prompt = `أنت محلل كروي للعبة "مين اللاعب؟". المطلوب ملف اللاعب: "${searchTarget}" (${cleanPlayerName}) - الجنسية: ${nationality || 'غير محددة'} - نمط: ${
        isAiKnowledgeMode ? 'معلومات AI' : 'ملف كروي'
      }.
${sourceInstructions}
ممنوع توليد أي أسئلة أو ألغاز. أعد النتيجة بصيغة JSON فقط بهذا الهيكل (واترك أي حقل غير معروف فارغاً "" أو []):
{"profile":{"playerName":"${cleanPlayerName}","displayName":"${cleanDisplayName}","aliases":["ألقاب"],"nationality":"","birthDate":"","shirtNumber":"","position":"","isRetired":false,"currentClub":"","lastClub":"","clubs":[],"leagues":[],"transfers":[],"careerTimeline":[],"nationalTeam":"","internationalCaps":"","internationalGoals":"","internationalTournaments":[],"leagueTitles":[],"cups":[],"internationalTrophies":[],"individualAwards":[],"trophies":[],"appearances":"","goals":"","assists":"","keyStats":[],"careerFacts":[],"notableTeammates":[],"notableManagers":[],"importantMatches":[],"verifiedFacts":[]}}`;

      const finalizeAiProfile = (rawProfile: any, provider: 'groq' | 'gemini') => {
        rawProfile.researchMode = 'ai_knowledge';
        rawProfile.researchProvider = provider;
        if (wikiSource) {
          rawProfile.verification = 'verified';
          rawProfile.sources = [
            {
              uri: wikiSource.url,
              title: wikiSource.lang === 'ar' ? 'ويكيبيديا العربية' : 'ويكيبيديا الإنجليزية',
            },
          ];
        } else {
          rawProfile.verification = 'unverified';
          rawProfile.sources = [];
        }

        const normalized = normalizeProfile(rawProfile, {
          playerName: cleanPlayerName,
          displayName: cleanDisplayName,
        });

        profileCache.set(cacheKey, normalized, 7 * 24 * 60 * 60 * 1000); // 7 days
        return res.json({ profile: normalized });
      };

      // Step 3A: Groq first
      if (groqReady) {
        const groqRes = await callGroq({
          fn: 'profile',
          messages: [{ role: 'user', content: prompt }],
          jsonMode: true,
          maxTokens: 1500,
        });
        if (groqRes.ok && groqRes.text) {
          const data = extractJson(groqRes.text);
          if (data && data.profile) {
            return finalizeAiProfile(data.profile, 'groq');
          }
          console.warn(
            `[Groq Error] fn=profile model=${groqRes.model || 'unknown'} status=200 type=parse_error code=invalid_json msg=Response missing profile JSON`
          );
          setLastAiError('parse');
        }
      }

      // Step 3B: Gemini fallback
      if (geminiReady) {
        const ai = getAiClient();
        const modelsToTry = getGeminiModels().filter(isModelAvailable);
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
              return finalizeAiProfile(data.profile, 'gemini');
            }
            console.warn(
              `[Gemini Error] fn=profile model=${model} status=200 type=parse_error code=invalid_json msg=Response missing profile JSON`
            );
            setLastAiError('parse');
          } catch (geminiError: any) {
            handleModelError(model, geminiError);
            const rawStatus = geminiError?.status ?? geminiError?.code;
            const numericStatus = typeof rawStatus === 'number' ? rawStatus : undefined;
            const stringCode = typeof rawStatus === 'string' ? rawStatus : undefined;
            const category = classifyAiError(numericStatus, stringCode, geminiError);
            setLastAiError(category);
            console.warn(
              `[Gemini Error] fn=profile model=${model} status=${numericStatus ?? 0} category=${category} msg=${sanitizeLogMessage(geminiError?.message || 'Gemini request failed')}`
            );
          }
        }
      }
    }

    // Step 4: Unavailable Profile when Gemini fails and not in DB
    const targetId = String(body.id || body.playerId || '');
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
    console.error('Error in /api/player-profile:', err instanceof Error ? err.message : 'Unknown error');
    return res.status(500).json({
      error: 'حصلت مشكلة وإحنا بنجهز معلومات اللاعب. جرب تاني.',
    });
  }
}

// 3. Round Picker AI Assistant
export async function aiAssistantHandler(req: any, res: any) {
  const clientIp = getClientIp(req);
  if (!checkRateLimit('assistant', clientIp, 20)) {
    return res.status(429).json({
      error: 'تجاوزت الحد المسموح من الأسئلة. استنى لحظة وجرب تاني.',
      errorCode: 'RATE_LIMITED',
    });
  }

  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const { playerProfile, question, history } = body;
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

    const groqReady = isAnyGroqAvailable();
    const geminiReady = isAnyGeminiAvailable();

    if (groqReady || geminiReady) {
      const clubsSummary = Array.isArray(playerProfile.clubs) ? playerProfile.clubs.slice(0, 6).join('، ') : '';
      const trophiesSummary = Array.isArray(playerProfile.trophies) ? playerProfile.trophies.slice(0, 6).join('، ') : '';

      const systemPrompt = `مساعد سري لصاحب الجولة في لعبة "مين اللاعب؟".
اللاعب: ${displayName} (${playerProfile.playerName || displayName}) | الجنسية: ${playerProfile.nationality || 'غير محددة'} | المركز: ${playerProfile.position || 'لاعب كرة قدم'} | الحالة: ${playerProfile.isRetired ? 'معتزل' : 'حالي'} | النادي: ${playerProfile.currentClub || playerProfile.lastClub || '-'} | الأندية: ${clubsSummary || '-'} | البطولات: ${trophiesSummary || '-'}.
أجب بالمصري في جملة أو جملتين بدقة تامة. لو مش متأكد قل: "مش متأكد من النقطة دي بصراحة، راجع معلوماتك."`;

      const sanitizedHistory: Array<{ sender: 'user' | 'ai'; text: string }> = [];
      if (Array.isArray(history)) {
        history.slice(-4).forEach((h: any) => {
          if (h && typeof h.text === 'string' && h.text.trim()) {
            if (h.sender === 'user') {
              sanitizedHistory.push({ sender: 'user', text: h.text.trim().slice(0, 200) });
            } else if (h.sender === 'ai') {
              sanitizedHistory.push({ sender: 'ai', text: h.text.trim().slice(0, 400) });
            }
          }
        });
      }

      // Provider 1: Groq (single system message + max_tokens: 150)
      if (groqReady) {
        const groqMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...sanitizedHistory.map((h) => ({
            role: (h.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: h.text,
          })),
          { role: 'user' as const, content: trimmedQuestion },
        ];

        const groqRes = await callGroq({
          fn: 'assistant',
          messages: groqMessages,
          maxTokens: 150,
          temperature: 0.3,
        });

        if (groqRes.ok && groqRes.text) {
          return res.json({ answer: groqRes.text });
        }
      }

      // Provider 2: Gemini fallback
      if (geminiReady) {
        const ai = getAiClient();
        const chatContents = [
          ...sanitizedHistory.map((h) => ({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          })),
          { role: 'user', parts: [{ text: trimmedQuestion }] },
        ];

        const modelsToTry = getGeminiModels().filter(isModelAvailable);
        for (const model of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: chatContents as any,
              config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: 150,
              },
            });

            const reply = response.text?.trim();
            if (reply) {
              return res.json({ answer: reply });
            }
          } catch (geminiError: any) {
            handleModelError(model, geminiError);
            const rawStatus = geminiError?.status ?? geminiError?.code;
            const numericStatus = typeof rawStatus === 'number' ? rawStatus : undefined;
            const stringCode = typeof rawStatus === 'string' ? rawStatus : undefined;
            const category = classifyAiError(numericStatus, stringCode, geminiError);
            setLastAiError(category);
            console.warn(
              `[Gemini Error] fn=assistant model=${model} status=${numericStatus ?? 0} category=${category} msg=${sanitizeLogMessage(geminiError?.message || 'Gemini request failed')}`
            );
          }
        }
      }
    }

    // Fallback: Local rule-based assistant
    const localReply = generateLocalAssistantReply(playerProfile, trimmedQuestion);
    return res.json({ answer: localReply });
  } catch (err: unknown) {
    console.error('Error in /api/ai-assistant:', err instanceof Error ? err.message : 'Unknown error');
    return res.status(500).json({
      error: 'الـAI مش قادر يرد دلوقتي.',
    });
  }
}
