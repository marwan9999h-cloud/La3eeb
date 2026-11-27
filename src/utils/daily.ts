import { DailyQuestion, DAILY_QUESTION_COUNT } from '../data/dailyQuestions';

/**
 * Daily challenge logic: deterministic question selection per day (same
 * questions for everyone on the same date), option shuffling, streaks.
 * Pure functions are unit-tested; storage helpers are guarded for non-browser
 * environments.
 */

export const DAILY_STREAK_KEY = 'laa3eeb_daily_streak_v1';
export const DAILY_LAST_PLAYED_KEY = 'laa3eeb_daily_last_played_v1';
export const DAILY_BEST_KEY = 'laa3eeb_daily_best_v1';

/** Local calendar day as YYYY-MM-DD. */
export function dailyKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Adds (or subtracts) whole days from a YYYY-MM-DD key. */
export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map((p) => parseInt(p, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return dailyKey(date);
}

/** FNV-1a 32-bit hash, stable across runs. */
export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** mulberry32 PRNG: deterministic sequence from a numeric seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle using the given RNG. */
export function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ShuffledOption {
  text: string;
  isCorrect: boolean;
}

export interface DailyChallengeQuestion {
  id: string;
  question: string;
  options: ShuffledOption[];
}

/**
 * Builds today's challenge: picks `count` questions deterministically from
 * the bank and shuffles each question's options with the same daily seed, so
 * everyone on the same date gets the same set in the same order.
 */
export function buildDailyChallenge(
  bank: DailyQuestion[],
  key: string,
  count: number = DAILY_QUESTION_COUNT
): DailyChallengeQuestion[] {
  if (!bank || bank.length === 0) return [];
  const rng = mulberry32(fnv1a(`laa3eeb-daily:${key}`));
  const picked = seededShuffle(bank, rng).slice(0, Math.max(1, Math.min(count, bank.length)));
  return picked.map((q) => {
    const withFlags: ShuffledOption[] = q.options.map((text, i) => ({
      text,
      isCorrect: i === q.correctIndex,
    }));
    return { id: q.id, question: q.question, options: seededShuffle(withFlags, rng) };
  });
}

/**
 * Streak after playing on `todayKey`:
 * - already played today: unchanged
 * - played yesterday: +1
 * - otherwise: resets to 1
 */
export function computeNextStreak(
  lastPlayedKey: string | null,
  currentStreak: number,
  todayKey: string
): number {
  const streak = Number.isFinite(currentStreak) && currentStreak > 0 ? Math.floor(currentStreak) : 0;
  if (lastPlayedKey === todayKey) return Math.max(1, streak);
  if (lastPlayedKey && addDays(lastPlayedKey, 1) === todayKey) return streak + 1;
  return 1;
}

export interface DailyProgress {
  streak: number;
  lastPlayed: string | null;
  /** Best score recorded for `todayKey`, null if not played today. */
  bestScoreToday: number | null;
}

function readBestMap(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(DAILY_BEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'number' && !isNaN(v)) clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

export function loadDailyProgress(todayKey: string = dailyKey()): DailyProgress {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { streak: 0, lastPlayed: null, bestScoreToday: null };
  }
  let streak = 0;
  let lastPlayed: string | null = null;
  try {
    const s = parseInt(window.localStorage.getItem(DAILY_STREAK_KEY) || '0', 10);
    streak = Number.isFinite(s) && s > 0 ? s : 0;
    lastPlayed = window.localStorage.getItem(DAILY_LAST_PLAYED_KEY);
  } catch {}
  // A streak only "counts" today if yesterday was played (or today already).
  if (lastPlayed && lastPlayed !== todayKey && addDays(lastPlayed, 1) !== todayKey) {
    streak = 0;
  }
  const best = readBestMap();
  return {
    streak,
    lastPlayed,
    bestScoreToday: typeof best[todayKey] === 'number' ? best[todayKey] : null,
  };
}

/** Records a finished challenge. Streak bumps once per calendar day; the day's best score is kept. */
export function saveDailyResult(
  score: number,
  todayKey: string = dailyKey()
): DailyProgress {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { streak: 0, lastPlayed: null, bestScoreToday: null };
  }
  const prev = loadDailyProgress(todayKey);
  const nextStreak = computeNextStreak(prev.lastPlayed, prev.streak, todayKey);
  const best = readBestMap();
  const prevBest = typeof best[todayKey] === 'number' ? best[todayKey] : -1;
  if (score > prevBest) best[todayKey] = score;
  try {
    window.localStorage.setItem(DAILY_STREAK_KEY, String(nextStreak));
    window.localStorage.setItem(DAILY_LAST_PLAYED_KEY, todayKey);
    window.localStorage.setItem(DAILY_BEST_KEY, JSON.stringify(best));
  } catch {}
  return {
    streak: nextStreak,
    lastPlayed: todayKey,
    bestScoreToday: best[todayKey],
  };
}

/** Arabic label for a streak length. */
export function streakLabel(streak: number): string {
  const n = Math.max(0, Math.floor(streak));
  if (n === 0) return 'لسه مفيش سلسلة';
  if (n === 1) return 'يوم واحد ورا بعض';
  if (n === 2) return 'يومين ورا بعض';
  if (n >= 3 && n <= 10) return `${n} أيام ورا بعض`;
  return `${n} يوم ورا بعض`;
}
