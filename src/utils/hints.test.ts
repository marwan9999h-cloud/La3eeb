import { describe, it, expect } from 'vitest';
import type { PlayerProfile } from '../types';
import {
  HINTS_PER_PLAYER,
  buildHintDeck,
  canRevealHint,
  decadeLabel,
  getNextHint,
} from './hints';

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    playerName: 'Thierry Henry',
    displayName: 'تييري هنري',
    aliases: ['Henry'],
    nationality: 'فرنسا',
    birthDate: '1977-08-17',
    position: 'مهاجم',
    isRetired: true,
    currentClub: undefined,
    lastClub: 'نيويورك ريد بولز',
    clubs: ['موناكو', 'يوفنتوس', 'أرسنال', 'برشلونة'],
    leagues: ['الدوري الإنجليزي', 'الدوري الإسباني'],
    nationalTeam: 'فرنسا',
    trophies: [],
    keyStats: [],
    careerFacts: [],
    verifiedFacts: [],
    ...overrides,
  };
}

describe('decadeLabel', () => {
  it('maps a birth date to its Arabic decade', () => {
    expect(decadeLabel('1977-08-17')).toBe('السبعينات');
    expect(decadeLabel('1993')).toBe('التسعينات');
    expect(decadeLabel('2001-01-01')).toBe('الألفينات');
  });

  it('returns null for missing or unreadable dates', () => {
    expect(decadeLabel(undefined)).toBeNull();
    expect(decadeLabel('')).toBeNull();
    expect(decadeLabel('غير معروف')).toBeNull();
    expect(decadeLabel('بدون تاريخ')).toBeNull();
  });
});

describe('buildHintDeck', () => {
  it('orders hints from general to specific', () => {
    const deck = buildHintDeck(makeProfile());
    // Capped at five cards, so the national team never reaches the deck.
    expect(deck.map((card) => card.key)).toEqual([
      'position',
      'nationality',
      'decade',
      'last-club',
      'league',
    ]);
    expect(deck[0]).toEqual({ key: 'position', label: 'المركز', value: 'مهاجم' });
  });

  it('prefers the current club over the last club', () => {
    const deck = buildHintDeck(
      makeProfile({ currentClub: 'أرسنال', lastClub: 'برشلونة', isRetired: false })
    );
    const club = deck.find((card) => card.key === 'current-club');
    expect(club?.value).toBe('أرسنال');
    expect(deck.some((card) => card.key === 'last-club')).toBe(false);
  });

  it('drops unknown or placeholder values instead of showing them', () => {
    const deck = buildHintDeck(
      makeProfile({
        nationality: 'غير معروف',
        position: '',
        birthDate: undefined,
        currentClub: 'غير متاح',
        lastClub: '  ',
        clubs: [],
        leagues: [],
        nationalTeam: 'سري',
      })
    );
    expect(deck).toEqual([]);
  });

  it('returns no hints for a secret in-mind player', () => {
    const deck = buildHintDeck(
      makeProfile({
        isCustomOrSecret: true,
        position: 'سري',
        nationality: 'سري',
      })
    );
    expect(deck).toEqual([]);
  });

  it('returns no hints when there is no profile', () => {
    expect(buildHintDeck(null)).toEqual([]);
    expect(buildHintDeck(undefined)).toEqual([]);
  });

  it('caps the deck so hints never become a full giveaway', () => {
    const deck = buildHintDeck(makeProfile());
    expect(deck.length).toBeLessThanOrEqual(5);
  });
});

describe('getNextHint', () => {
  it('walks the deck in order', () => {
    const profile = makeProfile();
    expect(getNextHint(profile, 0)?.key).toBe('position');
    expect(getNextHint(profile, 1)?.key).toBe('nationality');
  });

  it('returns null when the deck is finished', () => {
    const profile = makeProfile();
    expect(getNextHint(profile, buildHintDeck(profile).length)).toBeNull();
    expect(getNextHint(profile, 99)).toBeNull();
  });

  it('treats negative or invalid counts as the start of the deck', () => {
    const profile = makeProfile();
    expect(getNextHint(profile, -3)?.key).toBe('position');
    expect(getNextHint(profile, NaN)?.key).toBe('position');
  });
});

describe('canRevealHint', () => {
  it('allows one free hint per guesser per round', () => {
    const profile = makeProfile();
    expect(canRevealHint(profile, 0, 0)).toBe(true);
    expect(canRevealHint(profile, 0, HINTS_PER_PLAYER)).toBe(false);
  });

  it('blocks hints when the deck is exhausted', () => {
    const profile = makeProfile();
    expect(canRevealHint(profile, buildHintDeck(profile).length, 0)).toBe(false);
  });

  it('blocks hints for secret players and missing profiles', () => {
    expect(canRevealHint(null, 0, 0)).toBe(false);
    expect(canRevealHint(makeProfile({ isCustomOrSecret: true }), 0, 0)).toBe(false);
  });
});
