import { describe, it, expect, beforeEach } from 'vitest';
import {
  PRESET_THEMES,
  getContrastColor,
  buildCustomTheme,
  loadStoredTheme,
  saveTheme,
} from './theme';

describe('Theme Customization Utility', () => {
  // Simple in-memory mock for localStorage in node test environment
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

    // Provide safe global localStorage mock if not in browser
    if (typeof globalThis.localStorage === 'undefined') {
      (globalThis as any).localStorage = {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => {
          mockStorage[k] = v;
        },
        removeItem: (k: string) => {
          delete mockStorage[k];
        },
        clear: () => {
          Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
        },
      };
    } else {
      localStorage.clear();
    }
  });

  describe('PRESET_THEMES', () => {
    it('defines 5 accessible preset themes', () => {
      expect(PRESET_THEMES.length).toBe(5);
      const ids = PRESET_THEMES.map((t) => t.id);
      expect(ids).toEqual(['emerald', 'cyan', 'amber', 'purple', 'crimson']);
    });

    it('has valid hex color strings for each theme', () => {
      PRESET_THEMES.forEach((t) => {
        expect(t.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(t.primaryHover).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(t.primaryActive).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(t.contrastText).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('getContrastColor', () => {
    it('returns dark text #0B0D0C for bright colors (e.g. emerald #22C55E, yellow #F59E0B, cyan #06B6D4)', () => {
      expect(getContrastColor('#22C55E')).toBe('#0B0D0C');
      expect(getContrastColor('#F59E0B')).toBe('#0B0D0C');
      expect(getContrastColor('#06B6D4')).toBe('#0B0D0C');
      expect(getContrastColor('#FFFFFF')).toBe('#0B0D0C');
    });

    it('returns white text #FFFFFF for dark colors (e.g. deep purple, crimson #BE123C, navy #0F172A)', () => {
      expect(getContrastColor('#1E1B4B')).toBe('#FFFFFF');
      expect(getContrastColor('#BE123C')).toBe('#FFFFFF');
      expect(getContrastColor('#000000')).toBe('#FFFFFF');
    });
  });

  describe('buildCustomTheme', () => {
    it('generates a full theme object with accessible contrast from any 6-digit hex', () => {
      const custom = buildCustomTheme('#3B82F6');
      expect(custom.id).toBe('custom');
      expect(custom.primary).toBe('#3B82F6');
      expect(custom.primaryGlow).toContain('rgba(59, 130, 246');
      expect(custom.contrastText).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe('Theme Storage & Application', () => {
    it('defaults to emerald when storage is empty', () => {
      const { activeThemeId, theme } = loadStoredTheme();
      expect(activeThemeId).toBe('emerald');
      expect(theme.primary).toBe('#22C55E');
    });

    it('persists preset selection in localStorage', () => {
      const saved = saveTheme('cyan', '#06B6D4');
      expect(saved.id).toBe('cyan');

      const loaded = loadStoredTheme();
      expect(loaded.activeThemeId).toBe('cyan');
      expect(loaded.theme.primary).toBe('#06B6D4');
    });

    it('persists custom hex selection in localStorage', () => {
      saveTheme('custom', '#EC4899');
      const loaded = loadStoredTheme();
      expect(loaded.activeThemeId).toBe('custom');
      expect(loaded.customHex).toBe('#EC4899');
      expect(loaded.theme.primary).toBe('#EC4899');
    });
  });
});
