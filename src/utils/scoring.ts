import type { PlayerProfile } from '../types';
export const CORRECT_GUESS_BASE = 10;
export const NOBODY_WON_PICKER_POINTS = 8;
export const EXTRA_GUESS_COST = 3;

/**
 * Calculates question bonus based on questions used:
 * - 0 questions -> +3
 * - 1 question -> +2
 * - 2 or more questions -> +1
 * Negative or NaN values are sanitized to 0.
 */
export function getQuestionBonus(questionsUsed: number): number {
  const count =
    typeof questionsUsed === 'number' && !isNaN(questionsUsed)
      ? Math.max(0, Math.floor(questionsUsed))
      : 0;

  if (count === 0) return 3;
  if (count === 1) return 2;
  return 1;
}

/**
 * Calculates total points for a correct guess: BASE (10) + bonus (1..3).
 */
export function calcCorrectGuessPoints(questionsUsed: number): number {
  return CORRECT_GUESS_BASE + getQuestionBonus(questionsUsed);
}

/** Client-side profile for a player chosen in secret / without search. Status is never known. */
export function buildSecretProfile(customName?: string): PlayerProfile {
  const trimmedCustom = customName?.trim();
  const hasCustomName = Boolean(trimmedCustom);
  const chosenName = trimmedCustom || 'لاعب في السر';
  return {
    playerName: chosenName,
    displayName: chosenName,
    aliases: [chosenName],
    nationality: hasCustomName ? 'غير متاح' : 'في السر (يحدده صاحب الجولة)',
    position: hasCustomName ? 'غير متاح' : 'في السر (يحدده صاحب الجولة)',
    isRetired: false,
    isRetiredKnown: false,
    clubs: hasCustomName ? [] : ['سري'],
    leagues: hasCustomName ? [] : ['سري'],
    trophies: hasCustomName ? [] : ['سري'],
    keyStats: hasCustomName ? [] : ['تم اختيار هذا اللاعب في السر دون بحث.'],
    careerFacts: hasCustomName
      ? []
      : [
          'صاحب الجولة اختار هذا اللاعب في سره.',
          'يقوم الزملاء بتوجيه الأسئلة إليه ويجيبهم بنعم أو لا.',
        ],
    verifiedFacts: hasCustomName ? [] : ['لاعب سري في ذهن صاحب الجولة'],
    nationalTeam: hasCustomName ? '' : 'سري',
    verification: 'unverified',
    sources: [],
    isCustomOrSecret: true,
  };
}

/** Club label that never implies a retirement status the source did not give. */
export function clubLabel(profile: Pick<PlayerProfile, 'isRetired' | 'isRetiredKnown'>): string {
  if (profile.isRetiredKnown === false) return 'النادي';
  return profile.isRetired ? 'آخر نادي' : 'النادي الحالي';
}
