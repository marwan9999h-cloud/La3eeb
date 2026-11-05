import { describe, it, expect } from 'vitest';
import {
  computeAge,
  normalizeSearch,
  editDistance,
  searchFuzzy,
  validateDatabase,
  searchBuiltinPlayers,
  FAMOUS_PLAYERS_DB,
} from './playerDatabase';
import { PLAYERS_INDEX } from './playersIndex';
import { normalizeProfile } from './profileUtils';

describe('Player Database & Age Utilities', () => {
  const fixedNow = new Date('2026-10-22T12:00:00Z');

  describe('computeAge', () => {
    it('calculates exact age for "15 يونيو 1992" as 34 سنة in October 2026', () => {
      expect(computeAge('15 يونيو 1992', false, fixedNow)).toBe('34 سنة');
    });

    it('calculates exact age for "24 يونيو 1987" as 39 سنة in October 2026', () => {
      expect(computeAge('24 يونيو 1987', false, fixedNow)).toBe('39 سنة');
    });

    it('calculates exact age for "30 ديسمبر 1990" as 35 سنة in October 2026', () => {
      expect(computeAge('30 ديسمبر 1990', false, fixedNow)).toBe('35 سنة');
    });

    it('handles approximate year "عام 1990" returning "حوالي 36 سنة"', () => {
      expect(computeAge('عام 1990', false, fixedNow)).toBe('حوالي 36 سنة');
    });

    it('appends "(معتزل)" when player is retired', () => {
      const active = computeAge('15 يونيو 1992', false, fixedNow);
      const retired = computeAge('15 يونيو 1992', true, fixedNow);
      expect(active).toBe('34 سنة');
      expect(retired).toBe('34 سنة (معتزل)');
      expect(retired?.endsWith(' (معتزل)')).toBe(true);

      const approxRetired = computeAge('عام 1990', true, fixedNow);
      expect(approxRetired).toBe('حوالي 36 سنة (معتزل)');
    });

    it('returns undefined for text without a valid 4-digit year', () => {
      expect(computeAge('تاريخ غير معروف', false, fixedNow)).toBeUndefined();
      expect(computeAge('أكتوبر', false, fixedNow)).toBeUndefined();
      expect(computeAge('', false, fixedNow)).toBeUndefined();
      expect(computeAge('غير متاح', false, fixedNow)).toBeUndefined();
    });
  });

  describe('normalizeSearch', () => {
    it('normalizes alef variants "أحمد" to "احمد"', () => {
      expect(normalizeSearch('أحمد')).toBe('احمد');
    });

    it('normalizes taa marbuta "مصرية" to "مصريه"', () => {
      expect(normalizeSearch('مصرية')).toBe('مصريه');
    });

    it('strips Latin diacritics "Mbappé" to "mbappe"', () => {
      expect(normalizeSearch('Mbappé')).toBe('mbappe');
    });

    it('removes Arabic tashkeel/diacritics', () => {
      expect(normalizeSearch('مُحَمَّد')).toBe('محمد');
    });

    it('normalizes waw with hamza "مؤمن" to "مومن"', () => {
      expect(normalizeSearch('مؤمن')).toBe('مومن');
    });
  });

  describe('editDistance & searchFuzzy', () => {
    it('calculates correct bounded edit distance', () => {
      expect(editDistance('هالند', 'هالاند', 1)).toBe(1);
      expect(editDistance('mbape', 'mbappe', 1)).toBe(1);
      expect(editDistance('abc', 'xyz', 1)).toBe(2); // exceeds max 1 -> 2
    });

    const mockPool = [
      {
        id: 'erling-haaland',
        name: 'Erling Haaland',
        displayName: 'إيرلينج هالاند',
        aliases: ['هالاند', 'الوحش النرويجي'],
      },
      {
        id: 'kylian-mbappe',
        name: 'Kylian Mbappé',
        displayName: 'كيليان مبابي',
        aliases: ['مبابي', 'سلاحف النينجا'],
      },
      {
        id: 'mohamed-salah',
        name: 'Mohamed Salah',
        displayName: 'محمد صلاح',
        aliases: ['صلاح', 'أبو مكة'],
      },
    ];

    it('fuzzy matches "هالند" with "إيرلينج هالاند"', () => {
      const results = searchFuzzy('هالند', mockPool);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('erling-haaland');
    });

    it('fuzzy matches "mbape" with "Kylian Mbappé"', () => {
      const results = searchFuzzy('mbape', mockPool);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('kylian-mbappe');
    });

    it('returns empty array when query is under 4 characters', () => {
      expect(searchFuzzy('صلا', mockPool)).toEqual([]);
    });

    it('returns empty array for completely different text', () => {
      expect(searchFuzzy('حازم امام الموهوبين', mockPool)).toEqual([]);
    });
  });

  describe('Database & Index Integrity', () => {
    it('validates FAMOUS_PLAYERS_DB and PLAYERS_INDEX with 0 critical warnings', () => {
      const warnings = validateDatabase();
      expect(warnings).toEqual([]);
    });

    it('has PLAYERS_INDEX length between 200 and 260 players', () => {
      expect(PLAYERS_INDEX.length).toBeGreaterThanOrEqual(200);
      expect(PLAYERS_INDEX.length).toBeLessThanOrEqual(260);
      expect(PLAYERS_INDEX.length).toBe(220);
    });

    it('ensures all players in PLAYERS_INDEX have valid "idx-" ID and required fields', () => {
      const allowedPositions = ['مهاجم', 'جناح', 'لاعب وسط', 'مدافع', 'حارس مرمى'];
      for (const p of PLAYERS_INDEX) {
        expect(p.id.startsWith('idx-')).toBe(true);
        expect(p.name).toBeTruthy();
        expect(p.displayName).toBeTruthy();
        expect(p.nationality).toBeTruthy();
        expect(allowedPositions).toContain(p.position);
        expect(typeof p.isRetired).toBe('boolean');
        expect(Array.isArray(p.aliases)).toBe(true);
      }
    });

    it('searchBuiltinPlayers returns exact match as first result and empty for gibberish', () => {
      const results = searchBuiltinPlayers('محمد صلاح');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('mohamed-salah');

      const gibberish = searchBuiltinPlayers('سشيسشي شسيشسيشسي');
      expect(gibberish).toEqual([]);
    });
  });

  describe('normalizeProfile', () => {
    it('handles corrupted, null, and adversarial inputs safely', () => {
      const corrupted = {
        playerName: 'Test Player',
        clubs: 'not an array',
        keyStats: [123, null, undefined, 'A'.repeat(500), ''],
        trophies: new Array(50).fill('كأس'),
        isRetired: 'yes',
      };

      const normalized = normalizeProfile(corrupted, {
        playerName: 'Fallback Name',
        displayName: 'اسم بديل',
      });

      expect(normalized.playerName).toBe('Test Player');
      expect(normalized.displayName).toBe('اسم بديل');
      expect(Array.isArray(normalized.clubs)).toBe(true);
      expect(normalized.clubs).toEqual([]);
      expect(Array.isArray(normalized.keyStats)).toBe(true);
      expect(normalized.keyStats.length).toBeLessThanOrEqual(30);
      expect(normalized.keyStats.every((s: any) => typeof s === 'string' && s.length <= 200)).toBe(true);
      expect(normalized.trophies.length).toBeLessThanOrEqual(30);
      expect(typeof normalized.isRetired).toBe('boolean');
      expect(normalized.nationality).toBe('غير متاح');
    });

    it('handles completely null input', () => {
      const normalized = normalizeProfile(null);
      expect(normalized.playerName).toBe('غير متاح');
      expect(normalized.displayName).toBe('غير متاح');
      expect(normalized.isRetired).toBe(false);
      expect(normalized.clubs).toEqual([]);
    });
  });
});
