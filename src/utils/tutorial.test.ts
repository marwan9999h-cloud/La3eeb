import { describe, it, expect } from 'vitest';
import {
  TUTORIAL_SEEN_KEY,
  TUTORIAL_STEPS,
  hasSeenTutorial,
  markTutorialSeen,
  resetTutorialSeen,
} from './tutorial';

function makeFakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(key) ? (data.get(key) as string) : null),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe('tutorial steps', () => {
  it('has a title and body for every step', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(4);
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
      expect(step.emoji.trim().length).toBeGreaterThan(0);
    }
  });

  it('explains hints, daily challenge and sharing', () => {
    const allText = TUTORIAL_STEPS.map((step) => `${step.title} ${step.body}`).join(' ');
    expect(allText).toContain('تلميح');
    expect(allText).toContain('تحدي اليوم');
    expect(allText).toContain('شارك');
  });
});

describe('tutorial seen flag', () => {
  it('is unseen on a fresh device', () => {
    const storage = makeFakeStorage();
    expect(hasSeenTutorial(storage)).toBe(false);
  });

  it('is seen after marking, and unseen again after reset', () => {
    const storage = makeFakeStorage();
    markTutorialSeen(storage);
    expect(storage.getItem(TUTORIAL_SEEN_KEY)).toBe('1');
    expect(hasSeenTutorial(storage)).toBe(true);

    resetTutorialSeen(storage);
    expect(hasSeenTutorial(storage)).toBe(false);
  });

  it('treats any value other than 1 as unseen', () => {
    const storage = makeFakeStorage({ [TUTORIAL_SEEN_KEY]: 'true' });
    expect(hasSeenTutorial(storage)).toBe(false);
  });

  it('survives missing or throwing storage', () => {
    const broken: Storage = {
      ...makeFakeStorage(),
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(hasSeenTutorial(null)).toBe(false);
    expect(hasSeenTutorial(broken)).toBe(false);
    expect(() => markTutorialSeen(broken)).not.toThrow();
    expect(() => resetTutorialSeen(broken)).not.toThrow();
  });
});
