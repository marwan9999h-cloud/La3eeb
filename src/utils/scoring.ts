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
