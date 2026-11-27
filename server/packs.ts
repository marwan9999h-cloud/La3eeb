import { StoredPlayer, FAMOUS_PLAYERS_DB } from './playerDatabase.js';

/**
 * Player packs (باكات اللاعبين): themed groups of famous players the picker
 * can draw from randomly instead of free-typing a search. Packs are built
 * from FAMOUS_PLAYERS_DB only, so every draw is a well-known first-team
 * player with a full local profile (free, fast, no AI quota).
 */

export interface PlayerPack {
  id: string;
  label: string;
  emoji: string;
  description: string;
  matches: (p: StoredPlayer) => boolean;
}

const ARAB_NATIONALITIES = [
  'مصر',
  'المغرب',
  'الجزائر',
  'تونس',
  'السعودية',
  'الإمارات',
  'قطر',
  'ليبيا',
  'السودان',
  'العراق',
  'الأردن',
  'فلسطين',
  'الكويت',
  'عمان',
  'البحرين',
  'سوريا',
  'لبنان',
  'موريتانيا',
  'جيبوتي',
  'الصومال',
  'اليمن',
];

const playedInLeague = (p: StoredPlayer, leagueFragment: string, clubFragment: string): boolean =>
  (Array.isArray(p.leagues) && p.leagues.some((l) => l.includes(leagueFragment))) ||
  (Array.isArray(p.clubs) && p.clubs.some((c) => c.includes(clubFragment)));

export const PLAYER_PACKS: PlayerPack[] = [
  {
    id: 'legends',
    label: 'أساطير الكورة',
    emoji: '🏆',
    description: 'أسماء خلّدتها الذاكرة',
    matches: (p) => p.isRetired === true,
  },
  {
    id: 'premier-league',
    label: 'نجوم البريميرليج',
    emoji: '👑',
    description: 'لعيبة الدوري الإنجليزي',
    matches: (p) => playedInLeague(p, 'الإنجليزي', 'إنجلترا'),
  },
  {
    id: 'la-liga',
    label: 'نجوم الليجا',
    emoji: '⭐',
    description: 'لعيبة الدوري الإسباني',
    matches: (p) => playedInLeague(p, 'الإسباني', 'إسبانيا'),
  },
  {
    id: 'egypt-arab',
    label: 'نجوم مصر والعرب',
    emoji: '🌍',
    description: 'فخر العرب في الكورة العالمية',
    matches: (p) => ARAB_NATIONALITIES.some((n) => (p.nationality || '').includes(n)),
  },
  {
    id: 'attackers',
    label: 'هدافين ومهاجمين',
    emoji: '⚽',
    description: 'اللي بيخلّصوا الهجمة',
    matches: (p) => {
      const pos = p.position || '';
      return pos.includes('مهاجم') || pos.includes('جناح') || pos.includes('هداف');
    },
  },
  {
    id: 'keepers',
    label: 'حراس المرمى',
    emoji: '🧤',
    description: 'الصخرة الأخيرة',
    matches: (p) => (p.position || '').includes('حارس'),
  },
];

export function getPack(packId: string): PlayerPack | undefined {
  return PLAYER_PACKS.find((p) => p.id === packId);
}

/** All players in a pack, in database order. */
export function packPlayers(
  packId: string,
  db: StoredPlayer[] = FAMOUS_PLAYERS_DB
): StoredPlayer[] {
  const pack = getPack(packId);
  if (!pack || !Array.isArray(db)) return [];
  return db.filter((p) => p && pack.matches(p));
}

/** Deterministic when given an rng; null when the pack is unknown or empty. */
export function drawRandomFromPack(
  packId: string,
  db: StoredPlayer[] = FAMOUS_PLAYERS_DB,
  rng: () => number = Math.random
): StoredPlayer | null {
  const pool = packPlayers(packId, db);
  if (pool.length === 0) return null;
  const idx = Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)));
  return pool[idx];
}

/** Public candidate shape, identical to what /api/search-player returns. */
export function storedPlayerToCandidate(p: StoredPlayer) {
  return {
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    nationality: p.nationality || 'غير محددة',
    position: p.position || 'غير محدد',
    currentClubOrLast: p.isRetired ? p.lastClub || p.currentClub || '' : p.currentClub || p.lastClub || '',
    ...(typeof p.isRetired === 'boolean' ? { isRetired: p.isRetired } : {}),
    ...(p.eraOrNote ? { eraOrNote: p.eraOrNote } : {}),
  };
}

/** Pack metadata for clients (id/label/emoji/description only, no predicates). */
export function packListPayload(db: StoredPlayer[] = FAMOUS_PLAYERS_DB) {
  return PLAYER_PACKS.map((p) => ({
    id: p.id,
    label: p.label,
    emoji: p.emoji,
    description: p.description,
    count: packPlayers(p.id, db).length,
  }));
}
