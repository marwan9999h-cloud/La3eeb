import { describe, it, expect } from 'vitest';
import { rankPlayers } from './ranking';
import { Player } from '../types';

describe('Ranking Logic', () => {
  const createMockPlayer = (id: string, name: string, score: number, correctGuesses = 0): Player => ({
    id,
    name,
    score,
    correctGuesses,
    roundsAsPicker: 0,
    totalQuestionsUsed: 0,
  });

  it('ranks [10, 10, 5] as [0, 0, 2]', () => {
    const players = [
      createMockPlayer('p1', 'أحمد', 10),
      createMockPlayer('p2', 'محمود', 10),
      createMockPlayer('p3', 'علي', 5),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.map((r) => r.rank)).toEqual([0, 0, 2]);
  });

  it('ranks [10, 7, 7, 3] as [0, 1, 1, 3]', () => {
    const players = [
      createMockPlayer('p1', 'أحمد', 10),
      createMockPlayer('p2', 'سارة', 7),
      createMockPlayer('p3', 'منى', 7),
      createMockPlayer('p4', 'كريم', 3),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.map((r) => r.rank)).toEqual([0, 1, 1, 3]);
  });

  it('handles empty player list returning empty array', () => {
    expect(rankPlayers([])).toEqual([]);
  });

  it('ranks all zero scores [0, 0, 0] as [0, 0, 0]', () => {
    const players = [
      createMockPlayer('p1', 'أحمد', 0),
      createMockPlayer('p2', 'محمود', 0),
      createMockPlayer('p3', 'علي', 0),
    ];
    const ranked = rankPlayers(players);
    expect(ranked.map((r) => r.rank)).toEqual([0, 0, 0]);
  });
});
