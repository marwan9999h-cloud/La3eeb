export class TimeoutError extends Error {
  constructor(message: string = 'انتهت مهلة الاتصال بالخادم.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export const API_TIMEOUTS = {
  SEARCH: 10000,
  PROFILE: 15000,
  ASSISTANT: 15000,
} as const;

/**
 * Enhanced fetch with timeout using AbortController.
 * Links to external signal if provided, throws TimeoutError when deadline is exceeded.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const parentSignal = options.signal;

  let onParentAbort: (() => void) | undefined;
  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      onParentAbort = () => controller.abort();
      parentSignal.addEventListener('abort', onParentAbort);
    }
  }

  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (isTimedOut) {
      throw new TimeoutError('انتهت مهلة الاتصال بالخادم.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    if (parentSignal && onParentAbort) {
      parentSignal.removeEventListener('abort', onParentAbort);
    }
  }
}
