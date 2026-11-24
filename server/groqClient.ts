const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_PRIMARY_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_FALLBACK_MODEL = 'openai/gpt-oss-20b';
const GROQ_TIMEOUT_MS = 15_000;

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallGroqOptions {
  fn?: 'search' | 'profile' | 'assistant';
  messages: GroqMessage[];
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface CallGroqResult {
  ok: boolean;
  text?: string;
  model?: string;
  quotaExhausted?: boolean;
  networkError?: boolean;
}

export type AiErrorCategory =
  | 'auth'
  | 'rate_limit'
  | 'bad_request'
  | 'timeout'
  | 'parse'
  | 'unknown';

const groqModelCooldowns: Record<string, number> = {};
let lastAiError: AiErrorCategory | null = null;

export function getLastAiError(): AiErrorCategory | null {
  return lastAiError;
}

export function setLastAiError(category: AiErrorCategory | null): void {
  lastAiError = category;
}

export function classifyAiError(
  status?: number | null,
  code?: string | null,
  err?: unknown
): AiErrorCategory {
  const normCode = String(code || '').toLowerCase();
  const errName = err instanceof Error ? err.name.toLowerCase() : '';
  const errMsg = err instanceof Error ? err.message.toLowerCase() : '';

  if (
    status === 401 ||
    status === 403 ||
    normCode.includes('invalid_api_key') ||
    normCode.includes('auth') ||
    normCode.includes('permission_denied') ||
    normCode.includes('unauthenticated') ||
    errMsg.includes('api key') ||
    errMsg.includes('unauthorized') ||
    errMsg.includes('permission denied')
  ) {
    return 'auth';
  }

  if (
    status === 429 ||
    normCode.includes('rate_limit') ||
    normCode.includes('resource_exhausted') ||
    normCode.includes('quota') ||
    errMsg.includes('rate limit') ||
    errMsg.includes('resource_exhausted') ||
    errMsg.includes('quota')
  ) {
    return 'rate_limit';
  }

  if (
    errName === 'aborterror' ||
    errName === 'timeouterror' ||
    normCode.includes('timeout') ||
    normCode.includes('abort') ||
    errMsg.includes('timeout') ||
    errMsg.includes('timed out') ||
    errMsg.includes('aborted')
  ) {
    return 'timeout';
  }

  if (
    normCode === 'invalid_json' ||
    normCode === 'empty_content' ||
    normCode === 'length' ||
    normCode.includes('parse')
  ) {
    return 'parse';
  }

  if (
    status === 400 ||
    status === 404 ||
    status === 422 ||
    normCode.includes('invalid_argument') ||
    normCode.includes('not_found') ||
    normCode.includes('json_validate_failed') ||
    normCode.includes('bad_request') ||
    errMsg.includes('invalid argument') ||
    errMsg.includes('bad request')
  ) {
    return 'bad_request';
  }

  return 'unknown';
}

export function sanitizeLogMessage(msg: unknown): string {
  const str = String(msg || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/gsk_[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/AIza[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
  return str.slice(0, 150);
}

export function getGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || undefined;
}

export function getGroqModels(): string[] {
  const configured = process.env.GROQ_MODEL?.trim();
  const primary = configured || DEFAULT_PRIMARY_MODEL;
  const models = [primary];
  if (primary !== DEFAULT_FALLBACK_MODEL) {
    models.push(DEFAULT_FALLBACK_MODEL);
  }
  return models;
}

export function isGroqModelAvailable(model: string): boolean {
  if (!getGroqApiKey()) return false;
  const cooldownUntil = groqModelCooldowns[model] || 0;
  return Date.now() > cooldownUntil;
}

export function isAnyGroqAvailable(): boolean {
  return Boolean(getGroqApiKey()) && getGroqModels().some(isGroqModelAvailable);
}

export function resetGroqCooldowns(): void {
  for (const key of Object.keys(groqModelCooldowns)) {
    delete groqModelCooldowns[key];
  }
  lastAiError = null;
}

function handleGroqHttpError(model: string, status: number): void {
  if (status === 404) {
    groqModelCooldowns[model] = Date.now() + 30 * 60 * 1000;
  } else if (status === 429) {
    groqModelCooldowns[model] = Date.now() + 45 * 1000;
  }
}

export async function callGroq(options: CallGroqOptions): Promise<CallGroqResult> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return { ok: false };
  }

  const fnLabel = options.fn || 'unknown';
  const modelsToTry = getGroqModels().filter(isGroqModelAvailable);
  if (modelsToTry.length === 0) {
    return { ok: false, quotaExhausted: true };
  }

  let quotaExhausted = false;
  let networkError = false;

  for (const model of modelsToTry) {
    try {
      const isGptOss = model.includes('gpt-oss');
      const payload: Record<string, unknown> = {
        model,
        messages: options.messages,
        temperature: options.temperature ?? 0.2,
      };

      if (isGptOss) {
        payload.reasoning_effort = 'low';
      }

      if (typeof options.maxTokens === 'number') {
        payload.max_tokens = options.maxTokens;
      }

      if (options.jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeoutMs ?? GROQ_TIMEOUT_MS),
      });

      if (!response.ok) {
        let errType = 'http_error';
        let errCode = `http_${response.status}`;
        let errMsg = response.statusText || 'Request failed';

        try {
          const rawText = await response.text();
          const parsed = JSON.parse(rawText);
          if (parsed?.error) {
            if (typeof parsed.error.type === 'string' && parsed.error.type) {
              errType = parsed.error.type;
            }
            if (typeof parsed.error.code === 'string' && parsed.error.code) {
              errCode = parsed.error.code;
            }
            if (typeof parsed.error.message === 'string' && parsed.error.message) {
              errMsg = parsed.error.message;
            }
          } else if (rawText) {
            errMsg = rawText;
          }
        } catch {
          // Keep HTTP fallback details
        }

        const safeMsg = sanitizeLogMessage(errMsg);
        console.warn(
          `[Groq Error] fn=${fnLabel} model=${model} status=${response.status} type=${errType} code=${errCode} msg=${safeMsg}`
        );
        setLastAiError(classifyAiError(response.status, errCode || errType));

        handleGroqHttpError(model, response.status);
        if (response.status === 429) {
          quotaExhausted = true;
        } else if (response.status >= 500) {
          networkError = true;
        }
        continue;
      }

      const data: any = await response.json();
      const choice = data?.choices?.[0];
      const content = choice?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return {
          ok: true,
          text: content.trim(),
          model,
        };
      }

      const finishReason = String(choice?.finish_reason || 'empty_content');
      console.warn(
        `[Groq Error] fn=${fnLabel} model=${model} status=200 type=empty_content code=${finishReason} msg=Empty content in choice`
      );
      setLastAiError(classifyAiError(200, finishReason));
    } catch (err: unknown) {
      const errName = err instanceof Error && err.name ? err.name : 'Error';
      const rawMsg = err instanceof Error ? err.message : 'Unknown error';
      const safeMsg = sanitizeLogMessage(rawMsg);
      const category = classifyAiError(0, errName, err);
      if (
        category === 'timeout' ||
        safeMsg.toLowerCase().includes('fetch') ||
        safeMsg.toLowerCase().includes('network') ||
        safeMsg.includes('ECONNREFUSED') ||
        safeMsg.includes('ENOTFOUND')
      ) {
        networkError = true;
      }
      console.warn(
        `[Groq Error] fn=${fnLabel} model=${model} status=0 type=request_error code=${errName} msg=${safeMsg}`
      );
      setLastAiError(category);
    }
  }

  return {
    ok: false,
    quotaExhausted,
    networkError,
  };
}
