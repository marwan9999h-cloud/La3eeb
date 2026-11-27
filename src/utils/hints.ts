import type { PlayerProfile } from '../types';

export interface HintCard {
  key: string;
  label: string;
  value: string;
}

/** Free hints each guesser can reveal per round. */
export const HINTS_PER_PLAYER = 1;

/** Upper bound so the deck never turns into a full giveaway. */
const MAX_HINTS_IN_DECK = 5;

const UNKNOWN_VALUES = new Set([
  '',
  '-',
  '—',
  '–',
  '?',
  'غير معروف',
  'غير متاح',
  'غير متوفر',
  'مجهول',
  'سري',
  'unknown',
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
]);

function clean(value?: string | number | null): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (UNKNOWN_VALUES.has(text.toLowerCase())) return null;
  return text;
}

const DECADE_LABELS: Record<number, string> = {
  1930: 'الثلاثينات',
  1940: 'الأربعينات',
  1950: 'الخمسينات',
  1960: 'الستينات',
  1970: 'السبعينات',
  1980: 'الثمانينات',
  1990: 'التسعينات',
  2000: 'الألفينات',
  2010: 'جيل ما بعد 2010',
};

/** Turns a birth date into a decade label such as «التسعينات», or null when unknown. */
export function decadeLabel(birthDate?: string | number | null): string | null {
  const text = clean(birthDate);
  if (!text) return null;
  const match = text.match(/(1[89]\d{2}|20\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year)) return null;
  const decade = Math.floor(year / 10) * 10;
  return DECADE_LABELS[decade] ?? null;
}

function clubHint(profile: PlayerProfile): HintCard | null {
  const current = clean(profile.currentClub);
  if (current) {
    return { key: 'current-club', label: 'النادي الحالي', value: current };
  }
  const last = clean(profile.lastClub);
  if (last) {
    return { key: 'last-club', label: 'آخر نادي لعب فيه', value: last };
  }
  const fromList = (profile.clubs ?? []).map((club) => clean(club)).find(Boolean);
  if (fromList) {
    return { key: 'club', label: 'من أنديته', value: fromList };
  }
  return null;
}

/**
 * Ordered, general-to-specific hints for a round. Empty for custom/secret
 * players picked without a profile, since there is nothing true to reveal.
 */
export function buildHintDeck(profile: PlayerProfile | null | undefined): HintCard[] {
  if (!profile || profile.isCustomOrSecret) return [];

  const cards: HintCard[] = [];

  const position = clean(profile.position);
  if (position) cards.push({ key: 'position', label: 'المركز', value: position });

  const nationality = clean(profile.nationality);
  if (nationality) cards.push({ key: 'nationality', label: 'الجنسية', value: nationality });

  const decade = decadeLabel(profile.birthDate);
  if (decade) cards.push({ key: 'decade', label: 'الجيل', value: decade });

  const club = clubHint(profile);
  if (club) cards.push(club);

  const league = (profile.leagues ?? []).map((item) => clean(item)).find(Boolean);
  if (league) cards.push({ key: 'league', label: 'دوري مشهور لعب فيه', value: league });

  const nationalTeam = clean(profile.nationalTeam);
  if (nationalTeam) cards.push({ key: 'national-team', label: 'المنتخب', value: nationalTeam });

  return cards.slice(0, MAX_HINTS_IN_DECK);
}

/** The next hint to reveal, or null when the deck is finished or unavailable. */
export function getNextHint(
  profile: PlayerProfile | null | undefined,
  revealedCount: number
): HintCard | null {
  const deck = buildHintDeck(profile);
  const index =
    typeof revealedCount === 'number' && Number.isFinite(revealedCount)
      ? Math.max(0, Math.floor(revealedCount))
      : 0;
  return deck[index] ?? null;
}

/** Whether this guesser may still reveal a hint in the current round. */
export function canRevealHint(
  profile: PlayerProfile | null | undefined,
  revealedCount: number,
  hintsUsedByPlayer: number
): boolean {
  const used =
    typeof hintsUsedByPlayer === 'number' && Number.isFinite(hintsUsedByPlayer)
      ? Math.max(0, Math.floor(hintsUsedByPlayer))
      : 0;
  if (used >= HINTS_PER_PLAYER) return false;
  return getNextHint(profile, revealedCount) !== null;
}
