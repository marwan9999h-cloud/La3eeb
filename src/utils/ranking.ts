import { Player } from '../types';

export interface RankedPlayer {
  player: Player;
  rank: number;
}

/**
 * Standard Competition Ranking ("1224" ranking, 0-indexed: 0, 0, 2).
 * Sorts primarily by score descending. For stable display order, ties in score
 * are ordered by correctGuesses descending, then player name.
 * HOWEVER, rank is strictly determined by score alone.
 */
export function rankPlayers(players: Player[]): RankedPlayer[] {
  if (!players || players.length === 0) return [];

  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.correctGuesses !== a.correctGuesses) {
      return b.correctGuesses - a.correctGuesses;
    }
    return a.name.localeCompare(b.name, 'ar');
  });

  const ranked: RankedPlayer[] = [];
  let currentRank = 0;

  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    if (i === 0) {
      currentRank = 0;
    } else {
      const prevPlayer = sorted[i - 1];
      if (player.score === prevPlayer.score) {
        // Tied in score -> shares the exact same rank
      } else {
        // Next rank jumps to current index (competition ranking)
        currentRank = i;
      }
    }
    ranked.push({ player, rank: currentRank });
  }

  return ranked;
}
