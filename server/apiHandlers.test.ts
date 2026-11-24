import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  extractJson,
  healthHandler,
  searchPlayerHandler,
  playerProfileHandler,
  aiAssistantHandler,
  searchWikipediaPlayer,
  searchWikipediaPlayers,
  isRejectedWikipediaTitle,
  doesWikipediaTitleMatchPlayer,
  isTooGenericPlayerQuery,
  buildEnglishTransliterationVariants,
  canonicalizeQuery,
  _resetServerStateForTests,
} from './apiHandlers.js';
import { normalizeProfile } from './profileUtils.js';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe('extractJson', () => {
  it('parses plain JSON string', () => {
    expect(extractJson('{"ok":true,"count":2}')).toEqual({ ok: true, count: 2 });
  });

  it('parses JSON wrapped in markdown fences', () => {
    const raw = '```json\n{"exactMatch":true,"candidates":[]}\n```';
    expect(extractJson(raw)).toEqual({ exactMatch: true, candidates: [] });
  });

  it('extracts JSON surrounded by prose text', () => {
    const raw = 'Here is the result:\n{"answer":"نعم"}\nHope this helps!';
    expect(extractJson(raw)).toEqual({ answer: 'نعم' });
  });

  it('returns null for empty or invalid JSON', () => {
    expect(extractJson('')).toBeNull();
    expect(extractJson('not json at all')).toBeNull();
  });
});

describe('API Handlers Provider Order & Groq Integration', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    _resetServerStateForTests();
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('healthHandler reports aiProvider accurately without exposing keys', () => {
    const resNone = createMockRes();
    healthHandler({}, resNone);
    expect(resNone.body.aiProvider).toBe('none');
    expect(resNone.body.aiAvailable).toBe(false);
    expect(resNone.body.geminiAvailable).toBe(false);

    process.env.GEMINI_API_KEY = 'fake-gemini-key';
    const resGemini = createMockRes();
    healthHandler({}, resGemini);
    expect(resGemini.body.aiProvider).toBe('gemini');
    expect(resGemini.body.aiAvailable).toBe(true);
    expect(resGemini.body.geminiAvailable).toBe(true);

    process.env.GROQ_API_KEY = 'fake-groq-secret';
    const resGroq = createMockRes();
    healthHandler({}, resGroq);
    expect(resGroq.body.aiProvider).toBe('groq');
    expect(resGroq.body.aiAvailable).toBe(true);
    expect(JSON.stringify(resGroq.body)).not.toContain('fake-groq-secret');
    expect(JSON.stringify(resGroq.body)).not.toContain('fake-gemini-key');
  });

  it('prioritizes local_db before calling Wikipedia or Groq', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    const searchRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'محمد صلاح' }, headers: {}, socket: { remoteAddress: '127.0.0.1' } },
      searchRes
    );
    expect(searchRes.statusCode).toBe(200);
    expect(searchRes.body.candidates[0].id).toBe('mohamed-salah');

    const profileRes = createMockRes();
    await playerProfileHandler(
      { body: { playerName: 'Mohamed Salah' }, headers: {}, socket: { remoteAddress: '127.0.0.2' } },
      profileRes
    );
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.profile.researchMode).toBe('local_db');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses Wikipedia extract (<=3000 chars) + Groq and marks profile verified with source link', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    const longExtract = 'أحمد عبد القادر لاعب كرة قدم مصري '.repeat(200); // > 3000 chars
    let groqPayloadSent: any = null;

    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [{ pageid: 12345, title: 'أحمد عبد القادر (لاعب كرة قدم)', snippet: 'لاعب كرة قدم مصري في النادي الأهلي' }],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('ar.wikipedia.org') && url.includes('/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 12345,
            title: 'أحمد عبد القادر (لاعب كرة قدم)',
            description: 'لاعب كرة قدم مصري',
            extract: 'أحمد عبد القادر هو لاعب كرة قدم مصري.',
            content_urls: {
              desktop: { page: 'https://ar.wikipedia.org/wiki/Ahmed_Abdelkader' },
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('ar.wikipedia.org') && url.includes('prop=extracts')) {
        return new Response(
          JSON.stringify({
            query: {
              pages: {
                '12345': {
                  pageid: 12345,
                  title: 'أحمد عبد القادر (لاعب كرة قدم)',
                  fullurl: 'https://ar.wikipedia.org/wiki/Ahmed_Abdelkader',
                  extract: longExtract,
                },
              },
            },
          }),
          { status: 200 }
        );
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        groqPayloadSent = JSON.parse(init.body);
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    profile: {
                      playerName: 'Ahmed Abdelkader',
                      displayName: 'أحمد عبد القادر',
                      nationality: 'مصر',
                      position: 'جناح',
                      isRetired: false,
                      clubs: ['النادي الأهلي'],
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await playerProfileHandler(
      {
        body: { playerName: 'Ahmed Abdelkader', displayName: 'أحمد عبد القادر' },
        headers: {},
        socket: { remoteAddress: '127.0.0.3' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(groqPayloadSent).not.toBeNull();
    expect(groqPayloadSent.model).toBe('openai/gpt-oss-120b');
    expect(groqPayloadSent.max_tokens).toBe(1500);
    expect(groqPayloadSent.response_format).toEqual({ type: 'json_object' });
    expect(groqPayloadSent.messages[0].content.length).toBeLessThan(4600);
    expect(res.body.profile.researchMode).toBe('ai_knowledge');
    expect(res.body.profile.researchProvider).toBe('groq');
    expect(res.body.profile.verification).toBe('verified');
    expect(res.body.profile.sources).toEqual([
      { uri: 'https://ar.wikipedia.org/wiki/Ahmed_Abdelkader', title: 'ويكيبيديا العربية' },
    ]);
  });

  it('marks Groq profile unverified with empty sources when no Wikipedia extract is found', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('wikipedia.org')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    profile: {
                      playerName: 'Obscure Player',
                      displayName: 'لاعب مغمور',
                      nationality: 'مصر',
                      position: 'لاعب وسط',
                      isRetired: false,
                      clubs: [],
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await playerProfileHandler(
      {
        body: { playerName: 'Obscure Player', displayName: 'لاعب مغمور' },
        headers: {},
        socket: { remoteAddress: '127.0.0.4' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.profile.researchMode).toBe('ai_knowledge');
    expect(res.body.profile.verification).toBe('unverified');
    expect(res.body.profile.sources).toEqual([]);
  });

  it('falls back to backup Groq model on 429 and returns generic quota message if all fail', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    const calledModels: string[] = [];

    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (url.includes('wikipedia.org')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        const body = JSON.parse(init.body);
        calledModels.push(body.model);
        return new Response('rate limit', { status: 429 });
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'لاعب غير معروف' }, headers: {}, socket: { remoteAddress: '127.0.0.5' } },
      res
    );

    expect(calledModels).toEqual(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']);
    expect(res.statusCode).toBe(200);
    expect(res.body.errorCode).toBe('QUOTA_EXHAUSTED');
    expect(res.body.error).toContain('حصة البحث الذكي خلصت مؤقتًا');
    expect(res.body.error).not.toContain('Gemini');
    expect(res.body.planB.available).toBe(true);
  });

  it('uses single system message and max_tokens=150 for Groq in aiAssistantHandler', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    let capturedBody: any = null;

    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        capturedBody = JSON.parse(init.body);
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'أيوه لعب في الأهلي.' } }],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await aiAssistantHandler(
      {
        body: {
          playerProfile: { displayName: 'لاعب تجريبي', clubs: ['الأهلي'] },
          question: 'لعب في الأهلي؟',
        },
        headers: {},
        socket: { remoteAddress: '127.0.0.6' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.answer).toBe('أيوه لعب في الأهلي.');
    expect(capturedBody.max_tokens).toBe(150);
    expect(capturedBody.messages[0].role).toBe('system');
    expect(capturedBody.messages).toHaveLength(2);
  });
});

describe('Wikipedia Footballer Filtering', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    _resetServerStateForTests();
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects season, list, club, and disambiguation titles', () => {
    expect(isRejectedWikipediaTitle('2026–27 in Egyptian football')).toBe(true);
    expect(isRejectedWikipediaTitle('2025/26 Egyptian Premier League')).toBe(true);
    expect(isRejectedWikipediaTitle('List of Egyptian footballers')).toBe(true);
    expect(isRejectedWikipediaTitle('قائمة لاعبي الزمالك')).toBe(true);
    expect(isRejectedWikipediaTitle('كرة القدم في مصر')).toBe(true);
    expect(isRejectedWikipediaTitle('Zamalek SC')).toBe(true);
    expect(isRejectedWikipediaTitle('Mahmoud Saber (disambiguation)')).toBe(true);
    expect(isRejectedWikipediaTitle('Mahmoud Saber (footballer)')).toBe(false);
  });

  it('rejects "2026–27 in Egyptian football" and "List of Egyptian footballers" and falls back to not found + Plan B', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                { pageid: 901, title: '2026–27 in Egyptian football', snippet: 'Egyptian football season' },
                { pageid: 902, title: 'List of Egyptian footballers', snippet: 'association football players' },
                { pageid: 903, title: 'Mahmoud Saber (disambiguation)', snippet: 'may refer to' },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({ type: 'disambiguation', title: 'Mahmoud Saber', description: 'Disambiguation page' }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const wikiCand = await searchWikipediaPlayer('Mahmoud Saber Zamalek');
    expect(wikiCand).toBeNull();

    const searchRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'Mahmoud Saber Zamalek' }, headers: {}, socket: { remoteAddress: '127.0.0.10' } },
      searchRes
    );
    expect(searchRes.statusCode).toBe(404);
    expect(searchRes.body.errorCode).toBe('PLAYER_NOT_FOUND');
    expect(searchRes.body.candidates).toEqual([]);
    expect(searchRes.body.planB.available).toBe(true);
  });

  it('accepts a real footballer page whose REST summary description includes "footballer"', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                { pageid: 901, title: '2026–27 in Egyptian football', snippet: 'Egyptian football season' },
                { pageid: 777, title: 'Mahmoud Saber', snippet: 'Egyptian footballer' },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org/api/rest_v1/page/summary/Mahmoud_Saber')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 777,
            title: 'Mahmoud Saber',
            description: 'Egyptian footballer',
            extract: 'Mahmoud Saber (born 30 July 2001) is an Egyptian professional footballer who plays as a midfielder.',
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Mahmoud_Saber' },
            },
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const cand = await searchWikipediaPlayer('Mahmoud Saber');
    expect(cand).not.toBeNull();
    expect(cand.name).toBe('Mahmoud Saber');
    expect(cand.position).toBe('لاعب وسط');
  });
});

describe('Source & Identity Consistency, researchProvider & Category-Only Diagnostics', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    _resetServerStateForTests();
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('matches Arabic/English spelling variants and rejects clearly different people', () => {
    expect(doesWikipediaTitleMatchPlayer('Mahmoud Saber (footballer)', ['Mahmoud Saber'])).toBe(true);
    expect(doesWikipediaTitleMatchPlayer('محمود صابر (لاعب كرة قدم)', ['Mahmoud Saber'])).toBe(true);
    expect(doesWikipediaTitleMatchPlayer('مصطفى زيكو', ['Mostafa Ziko'])).toBe(true);
    expect(doesWikipediaTitleMatchPlayer('أحمد عبد القادر (لاعب كرة قدم)', ['Ahmed Abdelkader'])).toBe(true);

    expect(doesWikipediaTitleMatchPlayer('Mohamed Nasrawy', ['Mahmoud Saber'])).toBe(false);
    expect(doesWikipediaTitleMatchPlayer('محمد نصراوي', ['Mahmoud Saber', 'محمود صابر'])).toBe(false);
    expect(doesWikipediaTitleMatchPlayer('Mahmoud Al-Khatib', ['Mahmoud Saber'])).toBe(false);
  });

  it('drops mismatched Wikipedia page (Mohamed Nasrawy) for Mahmoud Saber and does not feed its text to AI', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    let capturedPrompt = '';

    const fetchMock = vi.fn(async (url: string, init?: any) => {
      if (url.includes('wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                {
                  pageid: 555,
                  title: 'Mohamed Nasrawy',
                  snippet: 'Mohamed Nasrawy is an Egyptian footballer',
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 555,
            title: 'Mohamed Nasrawy',
            description: 'Egyptian footballer',
            extract: 'Mohamed Nasrawy plays for Ismaily SC.',
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Mohamed_Nasrawy' },
            },
          }),
          { status: 200 }
        );
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        const body = JSON.parse(init.body);
        capturedPrompt = String(body.messages?.[0]?.content || '');
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    profile: {
                      playerName: 'Mahmoud Saber',
                      displayName: 'محمود صابر',
                      nationality: 'مصر',
                      position: 'لاعب وسط',
                      isRetired: false,
                      clubs: [],
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await playerProfileHandler(
      {
        body: { playerName: 'Mahmoud Saber', displayName: 'محمود صابر' },
        headers: {},
        socket: { remoteAddress: '127.0.0.20' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(capturedPrompt).not.toContain('Mohamed Nasrawy');
    expect(capturedPrompt).not.toContain('Ismaily');
    expect(res.body.profile.verification).toBe('unverified');
    expect(res.body.profile.sources).toEqual([]);
    expect(res.body.profile.researchProvider).toBe('groq');
  });

  it('preserves researchProvider only for groq or gemini in normalizeProfile', () => {
    expect(normalizeProfile({ researchProvider: 'groq' }).researchProvider).toBe('groq');
    expect(normalizeProfile({ researchProvider: 'gemini' }).researchProvider).toBe('gemini');
    expect(normalizeProfile({ researchProvider: 'other' }).researchProvider).toBeUndefined();
    expect(normalizeProfile({ researchMode: 'local_db' }).researchProvider).toBeUndefined();
  });

  it('exposes only short category strings in healthHandler lastAiError without leaking messages, bodies, or keys', async () => {
    const allowedCategories = new Set(['auth', 'rate_limit', 'bad_request', 'timeout', 'parse', 'unknown']);

    const scenarios: Array<{
      query: string;
      ip: string;
      responder: () => Promise<Response>;
      expectedCategory: string;
    }> = [
      {
        query: 'لاعب اختبار 1',
        ip: '127.0.1.1',
        expectedCategory: 'auth',
        responder: async () =>
          new Response(
            JSON.stringify({
              error: {
                type: 'authentication_error',
                code: 'invalid_api_key',
                message: 'Invalid API key gsk_secret_value_123456 in Authorization header',
              },
            }),
            { status: 401 }
          ),
      },
      {
        query: 'لاعب اختبار 2',
        ip: '127.0.1.2',
        expectedCategory: 'rate_limit',
        responder: async () =>
          new Response(
            JSON.stringify({
              error: { type: 'tokens', code: 'rate_limit_exceeded', message: 'Quota body details secret_req' },
            }),
            { status: 429 }
          ),
      },
      {
        query: 'لاعب اختبار 3',
        ip: '127.0.1.3',
        expectedCategory: 'bad_request',
        responder: async () =>
          new Response(
            JSON.stringify({
              error: { type: 'invalid_request_error', code: 'json_validate_failed', message: 'Prompt content leak' },
            }),
            { status: 400 }
          ),
      },
      {
        query: 'لاعب اختبار 4',
        ip: '127.0.1.4',
        expectedCategory: 'timeout',
        responder: async () => {
          const err = new Error('The operation was aborted due to timeout');
          err.name = 'TimeoutError';
          throw err;
        },
      },
      {
        query: 'لاعب اختبار 5',
        ip: '127.0.1.5',
        expectedCategory: 'parse',
        responder: async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'not-valid-json-response' }, finish_reason: 'stop' }],
            }),
            { status: 200 }
          ),
      },
      {
        query: 'لاعب اختبار 6',
        ip: '127.0.1.6',
        expectedCategory: 'unknown',
        responder: async () => new Response('Internal server stack trace at /var/task/groq', { status: 502 }),
      },
    ];

    for (const s of scenarios) {
      _resetServerStateForTests();
      process.env.GROQ_API_KEY = 'gsk_super_secret_key_for_test';

      globalThis.fetch = vi.fn(async (url: string) => {
        if (url.includes('wikipedia.org')) {
          return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
        }
        if (url === 'https://api.groq.com/openai/v1/chat/completions') {
          return s.responder();
        }
        return new Response('{}', { status: 404 });
      }) as any;

      const searchRes = createMockRes();
      await searchPlayerHandler(
        { body: { query: s.query }, headers: {}, socket: { remoteAddress: s.ip } },
        searchRes
      );

      const healthRes = createMockRes();
      healthHandler({}, healthRes);

      expect(typeof healthRes.body.lastAiError).toBe('string');
      expect(allowedCategories.has(healthRes.body.lastAiError)).toBe(true);
      expect(healthRes.body.lastAiError).toBe(s.expectedCategory);
      const serialized = JSON.stringify(healthRes.body);
      expect(serialized).not.toContain('gsk_');
      expect(serialized).not.toContain('Prompt content leak');
      expect(serialized).not.toContain('stack trace');
      expect(serialized).not.toContain(s.query);
    }
  });
});

describe('Ambiguous, Generic, Exact, and Multi-Source Player Search', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    _resetServerStateForTests();
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('rejects too-generic names ("محمد محمد", "محمد", "أحمد", "Mohamed Mohamed") and asks user in Arabic without picking a player', async () => {
    expect(isTooGenericPlayerQuery('محمد محمد')).toBe(true);
    expect(isTooGenericPlayerQuery('محمد')).toBe(true);
    expect(isTooGenericPlayerQuery('أحمد')).toBe(true);
    expect(isTooGenericPlayerQuery('Mohamed Mohamed')).toBe(true);
    expect(isTooGenericPlayerQuery('عبد الله')).toBe(true);
    expect(isTooGenericPlayerQuery('محمد صلاح')).toBe(false);
    expect(isTooGenericPlayerQuery('محمد شريف')).toBe(false);

    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    for (const [idx, genericQuery] of ['محمد محمد', 'محمد', 'Mohamed Mohamed'].entries()) {
      const res = createMockRes();
      await searchPlayerHandler(
        {
          body: { query: genericQuery },
          headers: {},
          socket: { remoteAddress: `127.0.2.${idx + 1}` },
        },
        res
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.candidates).toEqual([]);
      expect(res.body.exactMatch).toBe(false);
      expect(res.body.tooGeneric).toBe(true);
      expect(res.body.errorCode).toBe('TOO_GENERIC');
      expect(res.body.error).toMatch(/حدد|اكتب الاسم كامل/);
      expect(res.body.canFallbackToDirectPlay).toBe(true);
      expect(res.body.planB?.available).toBe(true);
      expect(res.body.planB?.suggestedCandidate?.displayName).toBe(genericQuery);
      expect(res.body.planB?.suggestedCandidate?.currentClubOrLast).toBe('');
      expect(res.body.planB?.suggestedCandidate?.nationality).toBe('');
      expect(res.body.planB?.suggestedCandidate?.position).toBe('');
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns exactMatch=true with a single clear candidate for "محمد صلاح"', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await searchPlayerHandler(
      {
        body: { query: 'محمد صلاح' },
        headers: {},
        socket: { remoteAddress: '127.0.2.10' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.exactMatch).toBe(true);
    expect(res.body.ambiguous).toBe(false);
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].id).toBe('mohamed-salah');
    expect(res.body.candidates[0].displayName).toBe('محمد صلاح');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns multi-source local DB + index suggestions without auto-selecting for ambiguous names ("الشناوي", "سيلفا") and leaves unknown club blank', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as any;

    const elShenawyRes = createMockRes();
    await searchPlayerHandler(
      {
        body: { query: 'الشناوي' },
        headers: {},
        socket: { remoteAddress: '127.0.2.11' },
      },
      elShenawyRes
    );

    expect(elShenawyRes.statusCode).toBe(200);
    expect(elShenawyRes.body.exactMatch).toBe(false);
    expect(elShenawyRes.body.ambiguous).toBe(true);
    expect(elShenawyRes.body.candidates.length).toBeGreaterThanOrEqual(2);
    expect(elShenawyRes.body.candidates[0].displayName).toBe('محمد الشناوي');
    expect(elShenawyRes.body.candidates[0].currentClubOrLast).toBeTruthy();

    const ahmedElShenawy = elShenawyRes.body.candidates.find((c: any) =>
      c.displayName.includes('أحمد الشناوي')
    );
    expect(ahmedElShenawy).toBeDefined();
    expect(ahmedElShenawy.currentClubOrLast).toBe('');

    const silvaRes = createMockRes();
    await searchPlayerHandler(
      {
        body: { query: 'سيلفا' },
        headers: {},
        socket: { remoteAddress: '127.0.2.12' },
      },
      silvaRes
    );

    expect(silvaRes.statusCode).toBe(200);
    expect(silvaRes.body.exactMatch).toBe(false);
    expect(silvaRes.body.ambiguous).toBe(true);
    expect(silvaRes.body.candidates.length).toBeGreaterThanOrEqual(2);
    expect(silvaRes.body.candidates.some((c: any) => c.displayName.includes('نيمار'))).toBe(true);
    expect(silvaRes.body.candidates.some((c: any) => c.displayName.includes('برناردو سيلفا'))).toBe(true);
  });

  it('returns multiple Wikipedia/web candidates for "محمد شريف" with distinguishing details and blanks out unknown fields instead of guessing', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                { pageid: 9001, title: 'محمد شريف (لاعب كرة قدم مصري)' },
                { pageid: 9002, title: 'محمد شريف (لاعب كرة قدم عراقي)' },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('مصري')) {
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 9001,
              title: 'محمد شريف (لاعب كرة قدم مصري)',
              description: 'لاعب كرة قدم مصري',
              extract: 'محمد شريف (مواليد 1996) هو لاعب كرة قدم مصري يلعب كمهاجم مع نادي الخليج.',
              content_urls: {
                desktop: { page: 'https://ar.wikipedia.org/wiki/محمد_شريف_1' },
              },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 9002,
            title: 'محمد شريف (لاعب كرة قدم عراقي)',
            description: 'لاعب كرة قدم',
            extract: 'محمد شريف هو لاعب كرة قدم سابق.',
            content_urls: {
              desktop: { page: 'https://ar.wikipedia.org/wiki/محمد_شريف_2' },
            },
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const wikiList = await searchWikipediaPlayers('محمد شريف');
    expect(wikiList).toHaveLength(2);
    expect(wikiList[0].nationality).toBe('مصر');
    expect(wikiList[0].position).toBe('مهاجم');
    expect(wikiList[0].currentClubOrLast).toBe('نادي الخليج');
    expect(wikiList[0].eraOrNote).toContain('مواليد 1996');
    // Unknown details on second candidate must stay blank, never guessed
    expect(wikiList[1].nationality).toBe('');
    expect(wikiList[1].position).toBe('');
    expect(wikiList[1].currentClubOrLast).toBe('');
    expect(wikiList[1].isRetired).toBe(true);

    const res = createMockRes();
    await searchPlayerHandler(
      {
        body: { query: 'محمد شريف' },
        headers: {},
        socket: { remoteAddress: '127.0.2.13' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.exactMatch).toBe(false);
    expect(res.body.ambiguous).toBe(true);
    expect(res.body.candidates.length).toBeGreaterThanOrEqual(2);
    expect(res.body.candidates[0].currentClubOrLast).toBe('نادي الخليج');
    expect(res.body.candidates[1].nationality).toBe('');
    expect(res.body.candidates[1].currentClubOrLast).toBe('');
  });

  it('merges AI and web candidates without guessing blank details or auto-picking multiple matches', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [{ pageid: 9101, title: 'أحمد حسن كوكا' }],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 9101,
            title: 'أحمد حسن كوكا',
            description: 'لاعب كرة قدم مصري',
            extract: 'أحمد حسن كوكا (مواليد 1993) هو لاعب كرة قدم مصري يلعب كمهاجم مع لوهافر.',
            content_urls: {
              desktop: { page: 'https://ar.wikipedia.org/wiki/أحمد_حسن_كوكا' },
            },
          }),
          { status: 200 }
        );
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    exactMatch: false,
                    ambiguous: true,
                    candidates: [
                      {
                        id: 'ahmed-hassan-koka',
                        name: 'Ahmed Hassan Kouka',
                        displayName: 'أحمد حسن كوكا',
                        nationality: 'مصر',
                        position: 'مهاجم',
                        currentClubOrLast: 'لوهافر',
                        isRetired: false,
                        eraOrNote: 'لاعب حالي',
                      },
                      {
                        id: 'ahmed-hassan-amid',
                        name: 'Ahmed Hassan',
                        displayName: 'أحمد حسن',
                        nationality: 'مصر',
                        position: 'غير معروف',
                        currentClubOrLast: 'دولي',
                        isRetired: true,
                        eraOrNote: 'عميد لاعبي العالم المعتزل',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await searchPlayerHandler(
      {
        body: { query: 'أحمد حسن كوكا' },
        headers: {},
        socket: { remoteAddress: '127.0.2.14' },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.exactMatch).toBe(false);
    expect(res.body.ambiguous).toBe(true);
    expect(res.body.candidates.length).toBeGreaterThanOrEqual(2);
    // Wikipedia candidate must have source-extracted details
    expect(res.body.candidates[0].id).toMatch(/^wiki-/);
    expect(res.body.candidates[0].nationality).toBe('مصر');
    expect(res.body.candidates[0].currentClubOrLast).toBe('لوهافر');

    const retiredAhmedHassan = res.body.candidates.find((c: any) => c.id === 'ahmed-hassan-amid');
    expect(retiredAhmedHassan).toBeDefined();
    // AI memory must NEVER fill nationality, position, or club in suggestions list
    expect(retiredAhmedHassan.nationality).toBe('');
    expect(retiredAhmedHassan.position).toBe('');
    expect(retiredAhmedHassan.currentClubOrLast).toBe('');
    expect(retiredAhmedHassan.isRetired).toBeUndefined();
  });

  it('uses transliterated English variants + Arabic lookup for "محمد شريف", excludes non-footballers, ranks exact-token before close spelling "محمد الشريف", and returns two different footballers separately', async () => {
    const variants = buildEnglishTransliterationVariants('محمد شريف');
    expect(variants).toContain('Mohamed Sherif');
    expect(variants).toContain('Mohammed Sherif');
    expect(variants).toContain('Muhammad Sherif');
    expect(variants).toContain('Mohamed Sherief');
    expect(variants).toContain('Mohamed Shareef');

    process.env.GROQ_API_KEY = 'test-groq-key';
    const searchedEnQueries: string[] = [];

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                { pageid: 3947750, title: 'محمد الشريف (لاعب كرة قدم سعودي)' },
                { pageid: 999001, title: 'محمد شريف (ممثل)' },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        const u = new URL(url);
        const srsearch = u.searchParams.get('srsearch') || '';
        searchedEnQueries.push(srsearch);

        if (srsearch.toLowerCase().startsWith('mohamed sherif')) {
          return new Response(
            JSON.stringify({
              query: {
                search: [
                  { pageid: 56449729, title: 'Mohamed Sherif (footballer, born 1996)' },
                  { pageid: 56449730, title: 'Mohamed Sherif (footballer, born 1991)' },
                ],
              },
            }),
            { status: 200 }
          );
        }
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('ممثل')) {
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 999001,
              title: 'محمد شريف (ممثل)',
              description: 'Egyptian actor',
              extract: 'Mohamed Sherif is an Egyptian actor who once played footballer role in cinema.',
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 3947750,
            title: 'محمد الشريف (لاعب كرة قدم سعودي)',
            description: 'لاعب كرة قدم سعودي',
            extract: 'محمد الشريف هو لاعب كرة قدم سعودي يلعب في الجناح الأيمن.',
            content_urls: {
              desktop: { page: 'https://ar.wikipedia.org/wiki/محمد_الشريف' },
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org/api/rest_v1/page/summary/')) {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('1996')) {
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 56449729,
              title: 'Mohamed Sherif (footballer, born 1996)',
              description: 'Egyptian footballer',
              extract:
                'Mohamed Sherif (born 4 February 1996) is an Egyptian professional footballer who plays as a forward for Al Ahly.',
              content_urls: {
                desktop: { page: 'https://en.wikipedia.org/wiki/Mohamed_Sherif_(footballer,_born_1996)' },
              },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 56449730,
            title: 'Mohamed Sherif (footballer, born 1991)',
            description: 'Sudanese footballer',
            extract:
              'Mohamed Sherif (born 12 May 1991) is a Sudanese footballer who plays as a defender.',
            content_urls: {
              desktop: { page: 'https://en.wikipedia.org/wiki/Mohamed_Sherif_(footballer,_born_1991)' },
            },
          }),
          { status: 200 }
        );
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    exactMatch: false,
                    ambiguous: true,
                    candidates: [
                      {
                        id: 'ai-only-sherif',
                        name: 'Mohamed Sherif',
                        displayName: 'محمد شريف AI',
                        nationality: 'البرازيل',
                        position: 'حارس مرمى',
                        currentClubOrLast: 'Real Madrid',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await searchPlayerHandler(
      {
        body: { query: 'محمد شريف' },
        headers: {},
        socket: { remoteAddress: '127.0.2.15' },
      },
      res
    );

    // Transliterated English lookups were executed alongside Arabic lookup
    expect(searchedEnQueries.some((q) => q.includes('Mohamed Sherif'))).toBe(true);
    expect(searchedEnQueries.some((q) => q.includes('Mohammed Sherif'))).toBe(true);
    expect(searchedEnQueries.some((q) => q.includes('Muhammad Sherif'))).toBe(true);
    expect(searchedEnQueries.some((q) => q.includes('Mohamed Sherief'))).toBe(true);
    expect(searchedEnQueries.some((q) => q.includes('Mohamed Shareef'))).toBe(true);

    expect(res.statusCode).toBe(200);
    expect(res.body.exactMatch).toBe(false);
    expect(res.body.ambiguous).toBe(true);

    // Non-footballer actor page must be excluded
    expect(res.body.candidates.some((c: any) => c.id === 'wiki-999001')).toBe(false);

    // Both Egyptian and Sudanese Mohamed Sherif + Saudi Mohamed Al-Sharif must appear separately
    const egyptSherifIdx = res.body.candidates.findIndex((c: any) => c.id === 'wiki-56449729');
    const sudanSherifIdx = res.body.candidates.findIndex((c: any) => c.id === 'wiki-56449730');
    const saudiSharifIdx = res.body.candidates.findIndex((c: any) => c.id === 'wiki-3947750');

    expect(egyptSherifIdx).toBeGreaterThanOrEqual(0);
    expect(sudanSherifIdx).toBeGreaterThanOrEqual(0);
    expect(saudiSharifIdx).toBeGreaterThanOrEqual(0);

    // Exact-token matches ("Mohamed Sherif") must rank BEFORE close spelling ("محمد الشريف")
    expect(egyptSherifIdx).toBeLessThan(saudiSharifIdx);
    expect(sudanSherifIdx).toBeLessThan(saudiSharifIdx);

    // Wikipedia source details preserved accurately; AI memory never leaks into unverified AI candidate
    expect(res.body.candidates[egyptSherifIdx].nationality).toBe('مصر');
    expect(res.body.candidates[egyptSherifIdx].currentClubOrLast).toBe('Al Ahly');
    expect(res.body.candidates[saudiSharifIdx].nationality).toBe('السعودية');
    expect(res.body.candidates[saudiSharifIdx].currentClubOrLast).toBe('');

    const aiOnly = res.body.candidates.find((c: any) => c.id === 'ai-only-sherif');
    if (aiOnly) {
      expect(aiOnly.nationality).toBe('');
      expect(aiOnly.position).toBe('');
      expect(aiOnly.currentClubOrLast).toBe('');
    }
  });
});

describe('Generic Canonicalization, Cross-Script Symmetry, Identity Dedup & Context Words', () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    _resetServerStateForTests();
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('unifies Arabic and English transliteration variants into a single canonical key', () => {
    expect(canonicalizeQuery('أحمد فتحي').canonicalKey).toBe(canonicalizeQuery('Ahmed Fathy').canonicalKey);
    expect(canonicalizeQuery('Ahmed Fathi').canonicalKey).toBe(canonicalizeQuery('Ahmad Fathy').canonicalKey);
    expect(canonicalizeQuery('محمد صلاح').canonicalKey).toBe(canonicalizeQuery('Mohammed Salah').canonicalKey);
    expect(canonicalizeQuery('Muhammad Salah').canonicalKey).toBe(canonicalizeQuery('Mohamed Salah').canonicalKey);
    expect(canonicalizeQuery('محمود صابر').canonicalKey).toBe(canonicalizeQuery('Mahmood Sabir').canonicalKey);
    expect(canonicalizeQuery('أحمد حسن').canonicalKey).toBe(canonicalizeQuery('Ahmad Hasan').canonicalKey);
    // Generic unseen phonetic names without lookup table entries
    expect(canonicalizeQuery('زوربا كوراني').canonicalKey).toBe(canonicalizeQuery('Zorba Kourani').canonicalKey);
    expect(canonicalizeQuery('Zorba Korany').canonicalKey).toBe(canonicalizeQuery('Zorba Kourani').canonicalKey);
  });

  it('produces identical ambiguous multi-candidate behavior for "أحمد فتحي" and "Ahmed Fathy" across Index + Wiki', async () => {
    const setupWikiMock = () =>
      vi.fn(async (url: string) => {
        if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
          return new Response(
            JSON.stringify({
              query: { search: [{ pageid: 4001, title: 'أحمد فتحي (لاعب كرة قدم مصري)' }] },
            }),
            { status: 200 }
          );
        }
        if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
          const u = new URL(url);
          const sr = (u.searchParams.get('srsearch') || '').toLowerCase();
          if (sr.includes('fathi') || sr.includes('fathy')) {
            return new Response(
              JSON.stringify({
                query: {
                  search: [
                    { pageid: 4002, title: 'Ahmed Fathi (footballer, born 1984)' },
                    { pageid: 4003, title: 'Ahmed Fathy (footballer, born 1993)' },
                  ],
                },
              }),
              { status: 200 }
            );
          }
          return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
        }
        if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 4001,
              title: 'أحمد فتحي (لاعب كرة قدم مصري)',
              description: 'لاعب كرة قدم مصري سابق',
              extract: 'أحمد فتحي (مواليد 10 نوفمبر 1984) هو لاعب كرة قدم مصري معتزل لعب في نادي بيراميدز.',
              content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/أحمد_فتحي' } },
            }),
            { status: 200 }
          );
        }
        if (url.includes('en.wikipedia.org/api/rest_v1/page/summary/')) {
          const decoded = decodeURIComponent(url);
          if (decoded.includes('1984')) {
            return new Response(
              JSON.stringify({
                type: 'standard',
                pageid: 4002,
                title: 'Ahmed Fathi (footballer, born 1984)',
                description: 'Egyptian former footballer',
                extract: 'Ahmed Fathi (born 10 November 1984) is an Egyptian former footballer who played for Al Ahly.',
                content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ahmed_Fathi_(1984)' } },
              }),
              { status: 200 }
            );
          }
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 4003,
              title: 'Ahmed Fathy (footballer, born 1993)',
              description: 'Qatari footballer',
              extract: 'Ahmed Fathy (born 25 January 1993) is a Qatari professional footballer who plays as a midfielder for Al-Arabi.',
              content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ahmed_Fathy_(1993)' } },
            }),
            { status: 200 }
          );
        }
        return new Response('{}', { status: 404 });
      });

    globalThis.fetch = setupWikiMock() as any;
    const arRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'أحمد فتحي' }, headers: {}, socket: { remoteAddress: '127.0.3.1' } },
      arRes
    );

    _resetServerStateForTests();
    globalThis.fetch = setupWikiMock() as any;
    const enRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'Ahmed Fathy' }, headers: {}, socket: { remoteAddress: '127.0.3.2' } },
      enRes
    );

    expect(arRes.statusCode).toBe(200);
    expect(enRes.statusCode).toBe(200);
    expect(arRes.body.exactMatch).toBe(false);
    expect(enRes.body.exactMatch).toBe(false);
    expect(arRes.body.ambiguous).toBe(true);
    expect(enRes.body.ambiguous).toBe(true);
    // Without proof that the curated index entry and the Wikipedia pages are the same person, they stay
    // separate candidates (user picks), Arabic and English give the same result, and both nationalities appear.
    expect(arRes.body.candidates.length).toBeGreaterThanOrEqual(2);
    expect(arRes.body.candidates.map((c: any) => c.id)).toEqual(enRes.body.candidates.map((c: any) => c.id));
    const nats = arRes.body.candidates.map((c: any) => c.nationality);
    expect(nats).toContain('مصر');
    expect(nats).toContain('قطر');
  });

  it('never short-circuits PLAYERS_INDEX homonyms ("أحمد حسن" / "Ahmed Hassan") to exactMatch=true when other distinct players exist', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                { pageid: 5001, title: 'أحمد حسن (لاعب كرة قدم مصري)' },
                { pageid: 5002, title: 'أحمد حسن كوكا' },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [{ pageid: 5003, title: 'Ahmed Hassan (Iraqi footballer)' }],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('كوكا')) {
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 5002,
              title: 'أحمد حسن كوكا',
              description: 'لاعب كرة قدم مصري',
              extract: 'أحمد حسن كوكا (مواليد 1993) هو لاعب كرة قدم مصري يلعب مع لوهافر.',
              content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/أحمد_حسن_كوكا' } },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 5001,
            title: 'أحمد حسن (لاعب كرة قدم مصري)',
            description: 'لاعب كرة قدم مصري معتزل',
            extract: 'أحمد حسن (مواليد 2 مايو 1975) هو لاعب كرة قدم مصري سابق لعب مع نادي الزمالك.',
            content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/أحمد_حسن' } },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 5003,
            title: 'Ahmed Hassan (Iraqi footballer)',
            description: 'Iraqi footballer',
            extract: 'Ahmed Hassan (born 1990) is an Iraqi footballer who plays as a midfielder.',
            content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ahmed_Hassan_(Iraqi)' } },
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const arRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'أحمد حسن' }, headers: {}, socket: { remoteAddress: '127.0.3.3' } },
      arRes
    );
    expect(arRes.statusCode).toBe(200);
    expect(arRes.body.exactMatch).toBe(false);
    expect(arRes.body.ambiguous).toBe(true);
    expect(arRes.body.candidates.length).toBeGreaterThanOrEqual(2);

    _resetServerStateForTests();
    const enRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'Ahmed Hassan' }, headers: {}, socket: { remoteAddress: '127.0.3.4' } },
      enRes
    );
    expect(enRes.statusCode).toBe(200);
    expect(enRes.body.exactMatch).toBe(false);
    expect(enRes.body.ambiguous).toBe(true);
    expect(enRes.body.candidates.length).toBe(arRes.body.candidates.length);
  });

  it('deduplicates same person with older vs newer club across Arabic and English Wikipedia when birth year matches (invented unseen name)', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: { search: [{ pageid: 6001, title: 'طارق منصور (لاعب كرة قدم)' }] },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: { search: [{ pageid: 6002, title: 'Tarek Mansour (footballer, born 1998)' }] },
          }),
          { status: 200 }
        );
      }
      if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 6001,
            title: 'طارق منصور (لاعب كرة قدم)',
            description: 'لاعب كرة قدم مصري',
            extract: 'طارق منصور (مواليد 4 فبراير 1998) هو لاعب كرة قدم مصري يلعب كمهاجم مع الأهلي.',
            content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/طارق_منصور' } },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org/api/rest_v1/page/summary/')) {
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 6002,
            title: 'Tarek Mansour (footballer, born 1998)',
            description: 'Egyptian footballer',
            extract: 'Tarek Mansour (born 4 February 1998) is an Egyptian professional footballer who plays as a forward for Al-Zawraa.',
            content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Tarek_Mansour' } },
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'طارق منصور' }, headers: {}, socket: { remoteAddress: '127.0.3.5' } },
      res
    );

    expect(res.statusCode).toBe(200);
    // Same birthYear 1998 across ar ("الأهلي") and en ("Al-Zawraa") -> merged into 1 single identity -> exactMatch=true!
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.exactMatch).toBe(true);
    expect(res.body.ambiguous).toBe(false);
  });

  it('requires source backing for exactMatch=true (unverified AI-only single guess returns exactMatch=false)', async () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('wikipedia.org')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    exactMatch: true,
                    ambiguous: false,
                    candidates: [
                      {
                        id: 'ai-zorba',
                        name: 'Zorba Kourani',
                        displayName: 'زوربا كوراني',
                        nationality: 'مصر',
                        position: 'مهاجم',
                        currentClubOrLast: 'الأهلي',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const res = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'زوربا كوراني' }, headers: {}, socket: { remoteAddress: '127.0.3.6' } },
      res
    );

    expect(res.statusCode).toBe(200);
    expect(res.body.exactMatch).toBe(false);
    expect(res.body.ambiguous).toBe(true);
    expect(res.body.candidates).toHaveLength(1);
    expect(res.body.candidates[0].nationality).toBe('');
    expect(res.body.candidates[0].position).toBe('');
    expect(res.body.candidates[0].currentClubOrLast).toBe('');
  });

  it('extracts context words to rank matching candidates and rejects unrelated club players when name does not match', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ar.wikipedia.org') && url.includes('list=search')) {
        return new Response(
          JSON.stringify({
            query: {
              search: [
                { pageid: 7001, title: 'كريم المنسي (لاعب كرة قدم مصري)' },
                { pageid: 7002, title: 'كريم المنسي (لاعب كرة قدم سعودي)' },
              ],
            },
          }),
          { status: 200 }
        );
      }
      if (url.includes('en.wikipedia.org') && url.includes('list=search')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url.includes('ar.wikipedia.org/api/rest_v1/page/summary/')) {
        const decoded = decodeURIComponent(url);
        if (decoded.includes('سعودي')) {
          return new Response(
            JSON.stringify({
              type: 'standard',
              pageid: 7002,
              title: 'كريم المنسي (لاعب كرة قدم سعودي)',
              description: 'لاعب كرة قدم سعودي',
              extract: 'كريم المنسي (مواليد 1997) هو لاعب كرة قدم سعودي يلعب كمهاجم مع نادي الهلال.',
              content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/كريم_المنسي_سعودي' } },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            type: 'standard',
            pageid: 7001,
            title: 'كريم المنسي (لاعب كرة قدم مصري)',
            description: 'لاعب كرة قدم مصري',
            extract: 'كريم المنسي (مواليد 1995) هو لاعب كرة قدم مصري يلعب كمهاجم مع نادي إنبي.',
            content_urls: { desktop: { page: 'https://ar.wikipedia.org/wiki/كريم_المنسي_مصري' } },
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    });
    globalThis.fetch = fetchMock as any;

    const rankedRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'كريم المنسي الهلال' }, headers: {}, socket: { remoteAddress: '127.0.3.7' } },
      rankedRes
    );

    expect(rankedRes.statusCode).toBe(200);
    expect(rankedRes.body.candidates).toHaveLength(2);
    expect(rankedRes.body.exactMatch).toBe(false);
    // Candidate whose source mentions الهلال ranks first
    expect(rankedRes.body.candidates[0].id).toBe('wiki-7002');
    expect(rankedRes.body.candidates[0].currentClubOrLast).toBe('نادي الهلال');

    // Now query a non-existent player + Zamalek, even with Groq hallucinating a Zamalek player
    _resetServerStateForTests();
    process.env.GROQ_API_KEY = 'test-groq-key';
    globalThis.fetch = vi.fn(async (url: string) => {
      if (url.includes('wikipedia.org')) {
        return new Response(JSON.stringify({ query: { search: [] } }), { status: 200 });
      }
      if (url === 'https://api.groq.com/openai/v1/chat/completions') {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    exactMatch: true,
                    ambiguous: false,
                    candidates: [
                      {
                        id: 'zizo',
                        name: 'Ahmed Sayed Zizo',
                        displayName: 'أحمد سيد زيزو',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response('{}', { status: 404 });
    }) as any;

    const notFoundRes = createMockRes();
    await searchPlayerHandler(
      { body: { query: 'Fakeplayer Zamalek' }, headers: {}, socket: { remoteAddress: '127.0.3.8' } },
      notFoundRes
    );

    expect(notFoundRes.statusCode).toBe(404);
    expect(notFoundRes.body.errorCode).toBe('PLAYER_NOT_FOUND');
    expect(notFoundRes.body.candidates).toEqual([]);
    expect(notFoundRes.body.planB.available).toBe(true);
    expect(notFoundRes.body.planB.query).toBe('Fakeplayer Zamalek');
  });
});

import { mergeCandidatesList, wikiTitleFromUrl } from './apiHandlers.js';

const mergeBase = {
  id: 'x',
  name: '',
  displayName: '',
  nationality: '',
  position: '',
  currentClubOrLast: '',
  _priority: 10,
};
const mergeWiki = (title: string, extra: any = {}) => ({
  ...mergeBase,
  id: 'wiki-' + title,
  name: title,
  displayName: title,
  _sourceTier: 2 as const,
  _sourceUrl: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title.replace(/ /g, '_')),
  ...extra,
});
const mergeCurated = (name: string, displayName: string, nationality: string, tier: 3 | 4 = 3) => ({
  ...mergeBase,
  id: 'idx-' + name,
  name,
  displayName,
  nationality,
  _sourceTier: tier,
});

describe('mergeCandidatesList identity safety', () => {
  it('parses wiki titles from URLs', () => {
    expect(wikiTitleFromUrl('https://en.wikipedia.org/wiki/Ahmed_Fathy_(Qatari_footballer)')).toBe(
      'Ahmed Fathy (Qatari footballer)'
    );
    expect(wikiTitleFromUrl(undefined)).toBe('');
  });

  it('does not merge same-name same-nationality candidates without identity evidence', () => {
    const out = mergeCandidatesList([
     mergeWiki('Karim Invented', { nationality: 'مصر', _birthYear: '1990', _sourceUrl: 'https://en.wikipedia.org/wiki/Karim_Invented_(footballer,_born_1990)' }),
     mergeWiki('Karim Invented', { id: 'wiki-2', nationality: 'مصر', _birthYear: '1990', _sourceUrl: 'https://en.wikipedia.org/wiki/Karim_Invented_(footballer,_born_1995)' }),
    ] as any);
    expect(out).toHaveLength(2);
  });

  it('does not treat a shared birth year as proof of identity', () => {
    const out = mergeCandidatesList([
     mergeWiki('Samir Test', { nationality: 'مصر', _birthYear: '1992' }),
      { ...mergeWiki('Samir Test', { nationality: 'مصر', _birthYear: '1992' }), id: 'other', _sourceUrl: 'https://ar.wikipedia.org/wiki/other' },
    ] as any);
    expect(out).toHaveLength(2);
  });

  it('merges identical source ids and identical Wikipedia URLs', () => {
    const a =mergeWiki('Same Page', { nationality: 'مصر' });
    const b = { ...mergeWiki('Same Page', { nationality: 'مصر' }), id: 'different-id' };
    expect(mergeCandidatesList([a, b] as any)).toHaveLength(1);
  });

  it('keeps a curated entry and an unsuffixed Wikipedia page separate when nothing proves they are the same person', () => {
    const out = mergeCandidatesList([
      mergeCurated('Mohamed Invented', 'محمد مخترع', 'مصر'),
     mergeWiki('Mohamed Invented', { nationality: 'مصر' }),
    ] as any);
    expect(out).toHaveLength(2);
  });

  it('merges same-name candidates only with corroborating nationality and matching club', () => {
    const out = mergeCandidatesList([
      { ...mergeCurated('Mohamed Invented', 'محمد مخترع', 'مصر'), currentClubOrLast: 'الأهلي' },
     mergeWiki('Mohamed Invented', { nationality: 'مصر', currentClubOrLast: 'الأهلي' }),
    ] as any);
    expect(out).toHaveLength(1);
  });

  it('does not let an unverified AI stub with blank fields hide a distinct person', () => {
    const out = mergeCandidatesList([
     mergeWiki('Hany Invented', { nationality: 'مصر', currentClubOrLast: 'الزمالك' }),
      { ...mergeBase, id: 'ai-0', name: 'Hany Invented', displayName: 'Hany Invented', _sourceTier: 1 as const },
    ] as any);
    expect(out).toHaveLength(2);
  });

  it('keeps a homonym with a disambiguated Wikipedia title separate from the curated entry', () => {
    const out = mergeCandidatesList([
      mergeCurated('Mohamed Invented', 'محمد مخترع', 'مصر'),
     mergeWiki('Mohamed Invented (footballer, born 1999)', { nationality: 'مصر' }),
    ] as any);
    expect(out).toHaveLength(2);
  });

  it('does not fold a curated entry into a Wikipedia page of a different nationality or club', () => {
    expect(
      mergeCandidatesList([
        mergeCurated('Ali Invented', 'علي مخترع', 'مصر'),
       mergeWiki('Ali Invented', { nationality: 'قطر' }),
      ] as any)
    ).toHaveLength(2);
    expect(
      mergeCandidatesList([
        { ...mergeCurated('Ali Invented', 'علي مخترع', 'مصر'), currentClubOrLast: 'الأهلي' },
       mergeWiki('Ali Invented', { nationality: 'مصر', currentClubOrLast: 'الزمالك' }),
      ] as any)
    ).toHaveLength(2);
  });

  it('keeps a candidate with unknown nationality and a longer name instead of hiding it', () => {
    const out = mergeCandidatesList([
     mergeWiki('Ahmed Invented', { nationality: 'قطر', currentClubOrLast: 'Al-Arabi' }),
     mergeWiki('Ahmed Invented Mansi', { nationality: '' }),
    ] as any);
    expect(out.map((c: any) => c.displayName)).toContain('Ahmed Invented Mansi');
    expect(out).toHaveLength(2);
  });

  it('keeps two curated entries with the same name separate', () => {
    const out = mergeCandidatesList([
      mergeCurated('Tarek Invented', 'طارق مخترع', 'مصر'),
      { ...mergeCurated('Tarek Invented', 'طارق مخترع', 'مصر'), id: 'idx-other' },
    ] as any);
    expect(out).toHaveLength(2);
  });
});
