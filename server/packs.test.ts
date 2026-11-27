import { describe, it, expect } from 'vitest';
import {
  PLAYER_PACKS,
  packPlayers,
  drawRandomFromPack,
  storedPlayerToCandidate,
  packListPayload,
} from './packs';
import { FAMOUS_PLAYERS_DB } from './playerDatabase';

describe('PLAYER_PACKS', () => {
  it('has unique ids and labels', () => {
    const ids = PLAYER_PACKS.map((p) => p.id);
    const labels = PLAYER_PACKS.map((p) => p.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('every pack is non-empty on the famous players database', () => {
    for (const pack of PLAYER_PACKS) {
      const pool = packPlayers(pack.id);
      expect(pool.length, `pack ${pack.id} should have players`).toBeGreaterThan(0);
    }
  });

  it('legends pack only has retired players', () => {
    for (const p of packPlayers('legends')) {
      expect(p.isRetired).toBe(true);
    }
  });

  it('egypt-arab pack contains Mohamed Salah when present in the db', () => {
    const pool = packPlayers('egypt-arab');
    const salah = pool.find((p) => p.id === 'mohamed-salah');
    expect(salah).toBeDefined();
  });

  it('keepers pack only has goalkeepers', () => {
    for (const p of packPlayers('keepers')) {
      expect(p.position).toContain('حارس');
    }
  });
});

describe('drawRandomFromPack', () => {
  it('always returns a member of the pack', () => {
    for (let i = 0; i < 25; i++) {
      const drawn = drawRandomFromPack('legends');
      expect(drawn).not.toBeNull();
      expect(packPlayers('legends').map((p) => p.id)).toContain(drawn!.id);
    }
  });

  it('is deterministic for a seeded rng and respects bounds', () => {
    const pool = packPlayers('premier-league');
    expect(drawRandomFromPack('premier-league', FAMOUS_PLAYERS_DB, () => 0)!.id).toBe(pool[0].id);
    expect(drawRandomFromPack('premier-league', FAMOUS_PLAYERS_DB, () => 0.9999)!.id).toBe(
      pool[pool.length - 1].id
    );
  });

  it('returns null for unknown packs', () => {
    expect(drawRandomFromPack('no-such-pack')).toBeNull();
  });
});

describe('storedPlayerToCandidate', () => {
  it('maps a stored player to the public candidate shape', () => {
    const pool = packPlayers('legends');
    const c = storedPlayerToCandidate(pool[0]);
    expect(c.id).toBe(pool[0].id);
    expect(c.displayName).toBe(pool[0].displayName);
    expect(typeof c.nationality).toBe('string');
    expect(typeof c.position).toBe('string');
    expect(typeof c.currentClubOrLast).toBe('string');
    expect(c.isRetired).toBe(true);
  });

  it('prefers currentClub for active players and lastClub for retired', () => {
    const active = FAMOUS_PLAYERS_DB.find((p) => !p.isRetired && p.currentClub);
    if (active) {
      expect(storedPlayerToCandidate(active).currentClubOrLast).toBe(active.currentClub);
    }
    const retired = FAMOUS_PLAYERS_DB.find((p) => p.isRetired && p.lastClub);
    if (retired) {
      expect(storedPlayerToCandidate(retired).currentClubOrLast).toBe(retired.lastClub);
    }
  });
});

describe('packListPayload', () => {
  it('exposes metadata with counts and no predicates', () => {
    const payload = packListPayload();
    expect(payload.length).toBe(PLAYER_PACKS.length);
    for (const item of payload) {
      expect(item.count).toBeGreaterThan(0);
      expect(item.label.length).toBeGreaterThan(0);
      expect((item as any).matches).toBeUndefined();
    }
  });
});
