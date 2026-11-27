import { describe, it, expect } from 'vitest';
import {
  arabicRoundsLabel,
  buildGameOverShareModel,
  SHARE_CARD_URL,
} from './shareCard';
import { Player } from '../types';

const makePlayer = (id: string, name: string, score: number, correctGuesses = 0): Player => ({
  id,
  name,
  score,
  correctGuesses,
  roundsAsPicker: 0,
  totalQuestionsUsed: 0,
});

describe('arabicRoundsLabel', () => {
  it('handles 0, 1, 2, 3-10 and 11+', () => {
    expect(arabicRoundsLabel(0)).toBe('من غير جولات');
    expect(arabicRoundsLabel(1)).toBe('جولة واحدة');
    expect(arabicRoundsLabel(2)).toBe('جولتين');
    expect(arabicRoundsLabel(3)).toBe('3 جولات');
    expect(arabicRoundsLabel(10)).toBe('10 جولات');
    expect(arabicRoundsLabel(11)).toBe('11 جولة');
    expect(arabicRoundsLabel(25)).toBe('25 جولة');
  });

  it('sanitizes invalid input', () => {
    expect(arabicRoundsLabel(NaN)).toBe('من غير جولات');
    expect(arabicRoundsLabel(-4)).toBe('من غير جولات');
  });
});

describe('buildGameOverShareModel', () => {
  it('names a single champion and orders rows by rank', () => {
    const players = [
      makePlayer('1', 'مروان', 21, 2),
      makePlayer('2', 'عمر', 34, 3),
      makePlayer('3', 'كريم', 12, 1),
    ];
    const model = buildGameOverShareModel(players, 4);
    expect(model.isTie).toBe(false);
    expect(model.championNames).toEqual(['عمر']);
    expect(model.championScore).toBe(34);
    expect(model.championLine).toContain('عمر');
    expect(model.championLine).toContain('بطل القعدة');
    expect(model.rows.map((r) => r.name)).toEqual(['عمر', 'مروان', 'كريم']);
    expect(model.rows[0].rankLabel).toBe('🥇');
    expect(model.rows[1].rankLabel).toBe('🥈');
    expect(model.rows[2].rankLabel).toBe('🥉');
    expect(model.rows[0].isChampion).toBe(true);
    expect(model.roundsLine).toBe('لعبتوا 4 جولات');
    expect(model.footerUrl).toBe(SHARE_CARD_URL);
  });

  it('reports a shared first place on tied scores', () => {
    const players = [
      makePlayer('1', 'مروان', 20, 1),
      makePlayer('2', 'عمر', 20, 2),
      makePlayer('3', 'كريم', 9, 0),
    ];
    const model = buildGameOverShareModel(players, 2);
    expect(model.isTie).toBe(true);
    expect(model.championNames).toContain('مروان');
    expect(model.championNames).toContain('عمر');
    expect(model.championLine).toContain('تعادل');
    expect(model.rows.filter((r) => r.isChampion)).toHaveLength(2);
  });

  it('caps the leaderboard rows', () => {
    const players = Array.from({ length: 8 }, (_, i) =>
      makePlayer(`${i}`, `لاعب ${i + 1}`, 50 - i)
    );
    const model = buildGameOverShareModel(players, 8, 5);
    expect(model.rows).toHaveLength(5);
    expect(model.rows[4].name).toBe('لاعب 5');
  });

  it('handles an empty players list without crashing', () => {
    const model = buildGameOverShareModel([], 1);
    expect(model.championNames).toEqual([]);
    expect(model.rows).toEqual([]);
    expect(model.championScore).toBe(0);
  });
});
