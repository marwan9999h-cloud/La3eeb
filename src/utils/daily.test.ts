import { describe, it, expect } from 'vitest';
import {
  dailyKey,
  addDays,
  fnv1a,
  mulberry32,
  buildDailyChallenge,
  computeNextStreak,
  streakLabel,
} from './daily';
import { DAILY_QUESTIONS, DAILY_QUESTION_COUNT } from '../data/dailyQuestions';

describe('dailyKey / addDays', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(dailyKey(new Date(2026, 10, 27))).toBe('2026-11-27');
    expect(dailyKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-27', 1)).toBe('2026-11-28');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('fnv1a / mulberry32', () => {
  it('is deterministic', () => {
    expect(fnv1a('laa3eeb-daily:2026-11-27')).toBe(fnv1a('laa3eeb-daily:2026-11-27'));
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
    const r1 = mulberry32(42);
    const r2 = mulberry32(42);
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()]);
  });
});

describe('buildDailyChallenge', () => {
  it('returns the same questions in the same order for the same day', () => {
    const a = buildDailyChallenge(DAILY_QUESTIONS, '2026-11-27');
    const b = buildDailyChallenge(DAILY_QUESTIONS, '2026-11-27');
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
    expect(a[0].options.map((o) => o.text)).toEqual(b[0].options.map((o) => o.text));
  });

  it('changes the set across different days', () => {
    const a = buildDailyChallenge(DAILY_QUESTIONS, '2026-11-27').map((q) => q.id).join(',');
    const b = buildDailyChallenge(DAILY_QUESTIONS, '2026-11-28').map((q) => q.id).join(',');
    expect(a).not.toBe(b);
  });

  it('returns the requested count with exactly one correct option each', () => {
    const challenge = buildDailyChallenge(DAILY_QUESTIONS, '2026-11-27');
    expect(challenge).toHaveLength(DAILY_QUESTION_COUNT);
    for (const q of challenge) {
      expect(q.options).toHaveLength(4);
      expect(q.options.filter((o) => o.isCorrect)).toHaveLength(1);
    }
  });

  it('never repeats a question within one day', () => {
    const ids = buildDailyChallenge(DAILY_QUESTIONS, '2026-11-27').map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('handles an empty bank', () => {
    expect(buildDailyChallenge([], '2026-11-27')).toEqual([]);
  });
});

describe('computeNextStreak', () => {
  it('keeps the streak when replaying the same day', () => {
    expect(computeNextStreak('2026-11-27', 4, '2026-11-27')).toBe(4);
  });

  it('bumps the streak on a consecutive day', () => {
    expect(computeNextStreak('2026-11-26', 4, '2026-11-27')).toBe(5);
    expect(computeNextStreak('2026-11-30', 1, '2026-12-01')).toBe(2);
  });

  it('resets to 1 after a gap or when never played', () => {
    expect(computeNextStreak('2026-11-20', 9, '2026-11-27')).toBe(1);
    expect(computeNextStreak(null, 0, '2026-11-27')).toBe(1);
  });
});

describe('streakLabel', () => {
  it('pluralizes in Arabic', () => {
    expect(streakLabel(0)).toBe('لسه مفيش سلسلة');
    expect(streakLabel(1)).toBe('يوم واحد ورا بعض');
    expect(streakLabel(2)).toBe('يومين ورا بعض');
    expect(streakLabel(5)).toBe('5 أيام ورا بعض');
    expect(streakLabel(12)).toBe('12 يوم ورا بعض');
  });
});
