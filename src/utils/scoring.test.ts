import { buildSecretProfile, clubLabel } from './scoring';
import { describe, it, expect } from 'vitest';
import {
  CORRECT_GUESS_BASE,
  NOBODY_WON_PICKER_POINTS,
  EXTRA_GUESS_COST,
  getQuestionBonus,
  calcCorrectGuessPoints,
} from './scoring';

describe('Scoring Logic', () => {
  it('exports correct base constants', () => {
    expect(CORRECT_GUESS_BASE).toBe(10);
    expect(NOBODY_WON_PICKER_POINTS).toBe(8);
    expect(EXTRA_GUESS_COST).toBe(3);
  });

  describe('getQuestionBonus', () => {
    it('returns +3 for 0 questions used', () => {
      expect(getQuestionBonus(0)).toBe(3);
    });

    it('returns +2 for 1 question used', () => {
      expect(getQuestionBonus(1)).toBe(2);
    });

    it('returns +1 for 2 questions used', () => {
      expect(getQuestionBonus(2)).toBe(1);
    });

    it('returns +1 for 5 questions used', () => {
      expect(getQuestionBonus(5)).toBe(1);
    });

    it('sanitizes NaN to 0 and returns +3', () => {
      expect(getQuestionBonus(NaN)).toBe(3);
    });

    it('sanitizes negative numbers to 0 and returns +3', () => {
      expect(getQuestionBonus(-3)).toBe(3);
    });

    it('sanitizes non-integers by flooring (1.9 -> 1 question -> +2)', () => {
      expect(getQuestionBonus(1.9)).toBe(2);
    });
  });

  describe('calcCorrectGuessPoints', () => {
    it('calculates 10 + 3 = 13 for 0 questions', () => {
      expect(calcCorrectGuessPoints(0)).toBe(13);
    });

    it('calculates 10 + 2 = 12 for 1 question', () => {
      expect(calcCorrectGuessPoints(1)).toBe(12);
    });

    it('calculates 10 + 1 = 11 for 2 questions', () => {
      expect(calcCorrectGuessPoints(2)).toBe(11);
    });
  });
});

describe('secret / typed-name profile', () => {
  it('never claims a known retirement status', () => {
    expect(buildSecretProfile('Hany Said Elsayed').isRetiredKnown).toBe(false);
    expect(buildSecretProfile().isRetiredKnown).toBe(false);
  });
  it('is marked unverified and custom', () => {
    const p = buildSecretProfile('  Hany Said Elsayed ');
    expect(p.playerName).toBe('Hany Said Elsayed');
    expect(p.verification).toBe('unverified');
    expect(p.isCustomOrSecret).toBe(true);
  });
});

describe('clubLabel', () => {
  it('is neutral when status unknown', () => {
    expect(clubLabel({ isRetired: false, isRetiredKnown: false })).toBe('النادي');
  });
  it('keeps known labels', () => {
    expect(clubLabel({ isRetired: false, isRetiredKnown: true })).toBe('النادي الحالي');
    expect(clubLabel({ isRetired: true, isRetiredKnown: true })).toBe('آخر نادي');
    expect(clubLabel({ isRetired: true })).toBe('آخر نادي');
  });
});

