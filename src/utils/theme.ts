export interface ThemeColors {
  id: string;
  name: string;
  primary: string;         // Main accent (e.g., #22C55E)
  primaryHover: string;    // Accent hover (e.g., #1FA644)
  primaryActive: string;   // Accent active (e.g., #1A8D3A)
  primaryLight: string;    // Light tint (e.g., #4ADE80)
  primaryGlow: string;     // RGBA glow string (e.g., rgba(34, 197, 94, 0.25))
  primaryBgTint: string;   // Very subtle background tint (e.g., rgba(34, 197, 94, 0.08))
  contrastText: string;    // #0B0D0C or #FFFFFF depending on luminance
}

export const PRESET_THEMES: ThemeColors[] = [
  {
    id: 'emerald',
    name: 'نجيل الملعب (الأخضر الأصلي)',
    primary: '#22C55E',
    primaryHover: '#16A34A',
    primaryActive: '#15803D',
    primaryLight: '#4ADE80',
    primaryGlow: 'rgba(34, 197, 94, 0.25)',
    primaryBgTint: 'rgba(34, 197, 94, 0.08)',
    contrastText: '#0B0D0C',
  },
  {
    id: 'cyan',
    name: 'أزرق ستيديوم (سماوي كهربائي)',
    primary: '#06B6D4',
    primaryHover: '#0891B2',
    primaryActive: '#0E7490',
    primaryLight: '#67E8F9',
    primaryGlow: 'rgba(6, 182, 212, 0.25)',
    primaryBgTint: 'rgba(6, 182, 212, 0.08)',
    contrastText: '#0B0D0C',
  },
  {
    id: 'amber',
    name: 'الكرة الذهبية (أصفر وأمبر)',
    primary: '#F59E0B',
    primaryHover: '#D97706',
    primaryActive: '#B45309',
    primaryLight: '#FCD34D',
    primaryGlow: 'rgba(245, 158, 11, 0.25)',
    primaryBgTint: 'rgba(245, 158, 11, 0.08)',
    contrastText: '#0B0D0C',
  },
  {
    id: 'purple',
    name: 'أبطال أوروبا (بنفسجي ملكي)',
    primary: '#A855F7',
    primaryHover: '#9333EA',
    primaryActive: '#7E22CE',
    primaryLight: '#C084FC',
    primaryGlow: 'rgba(168, 85, 247, 0.25)',
    primaryBgTint: 'rgba(168, 85, 247, 0.08)',
    contrastText: '#0B0D0C',
  },
  {
    id: 'crimson',
    name: 'حماس الديربي (أحمر قرمزي)',
    primary: '#F43F5E',
    primaryHover: '#E11D48',
    primaryActive: '#BE123C',
    primaryLight: '#FB7185',
    primaryGlow: 'rgba(244, 63, 94, 0.25)',
    primaryBgTint: 'rgba(244, 63, 94, 0.08)',
    contrastText: '#FFFFFF',
  },
];

const THEME_STORAGE_KEY = 'guess_the_player_theme_custom';

/**
 * Calculates relative luminance to pick contrast text (#0B0D0C vs #FFFFFF)
 */
export function getContrastColor(hexColor: string): string {
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return '#0B0D0C';

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  const luminance = a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  // Threshold 0.35 ensures cyan (#06B6D4: L ~0.37) and bright colors have dark readable text
  return luminance > 0.35 ? '#0B0D0C' : '#FFFFFF';
}

/**
 * Generates shades and properties for a custom color with readability guarantees
 */
export function buildCustomTheme(hexColor: string): ThemeColors {
  const contrast = getContrastColor(hexColor);
  const cleanHex = hexColor.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2) || '22', 16);
  const g = parseInt(cleanHex.substring(2, 4) || 'c5', 16);
  const b = parseInt(cleanHex.substring(4, 6) || '5e', 16);

  return {
    id: 'custom',
    name: 'لون مخصص',
    primary: hexColor,
    primaryHover: hexColor,
    primaryActive: hexColor,
    primaryLight: hexColor,
    primaryGlow: `rgba(${r}, ${g}, ${b}, 0.25)`,
    primaryBgTint: `rgba(${r}, ${g}, ${b}, 0.08)`,
    contrastText: contrast,
  };
}

/**
 * Injects CSS variables onto document.documentElement
 */
export function applyTheme(theme: ThemeColors) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.style.setProperty('--accent-green', theme.primary);
  root.style.setProperty('--accent-green-hover', theme.primaryHover);
  root.style.setProperty('--accent-green-active', theme.primaryActive);
  root.style.setProperty('--accent-green-light', theme.primaryLight);
  root.style.setProperty('--accent-glow', theme.primaryGlow);
  root.style.setProperty('--accent-bg-tint', theme.primaryBgTint);
  root.style.setProperty('--accent-contrast', theme.contrastText);
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
  } catch {}
  return null;
}

/**
 * Loads stored theme from localStorage or returns default Emerald theme
 */
export function loadStoredTheme(): { activeThemeId: string; customHex: string; theme: ThemeColors } {
  const defaultTheme = PRESET_THEMES[0];
  const storage = getSafeStorage();
  if (!storage) {
    return { activeThemeId: 'emerald', customHex: defaultTheme.primary, theme: defaultTheme };
  }

  try {
    const raw = storage.getItem(THEME_STORAGE_KEY);
    if (!raw) return { activeThemeId: 'emerald', customHex: defaultTheme.primary, theme: defaultTheme };

    const parsed = JSON.parse(raw);
    const activeId = parsed.activeThemeId || 'emerald';
    const customHex = parsed.customHex || '#22C55E';

    if (activeId === 'custom' && /^#[0-9A-Fa-f]{6}$/.test(customHex)) {
      const customTheme = buildCustomTheme(customHex);
      return { activeThemeId: 'custom', customHex, theme: customTheme };
    }

    const preset = PRESET_THEMES.find((t) => t.id === activeId) || defaultTheme;
    return { activeThemeId: preset.id, customHex, theme: preset };
  } catch {
    return { activeThemeId: 'emerald', customHex: defaultTheme.primary, theme: defaultTheme };
  }
}

/**
 * Saves theme configuration to localStorage and applies it
 */
export function saveTheme(activeThemeId: string, customHex: string): ThemeColors {
  let themeToApply: ThemeColors;

  if (activeThemeId === 'custom' && /^#[0-9A-Fa-f]{6}$/.test(customHex)) {
    themeToApply = buildCustomTheme(customHex);
  } else {
    themeToApply = PRESET_THEMES.find((t) => t.id === activeThemeId) || PRESET_THEMES[0];
  }

  applyTheme(themeToApply);

  try {
    const storage = getSafeStorage();
    if (storage) {
      storage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ activeThemeId, customHex })
      );
    }
  } catch (err) {
    console.warn('Failed to save theme in localStorage:', err);
  }

  return themeToApply;
}
