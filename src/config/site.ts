/**
 * Central configuration for site metadata, URLs, and PWA settings.
 * Designed to adapt effortlessly to any official domain or subpath.
 */

export interface SiteConfig {
  name: string;
  shortName: string;
  description: string;
  lang: string;
  dir: 'rtl' | 'ltr';
  themeColor: string;
  backgroundColor: string;
  baseUrl: string;
  apiUrl: string;
}

export const SITE_CONFIG: SiteConfig = {
  name: 'خَمِّن اللاعب ⚽',
  shortName: 'خَمِّن اللاعب',
  description: 'لعبة تخمين لاعيبة كورة للصحاب على نفس الجهاز. واحد يختار لاعب في السر.. والباقي يسأل ويخمن!',
  lang: 'ar',
  dir: 'rtl',
  themeColor: '#0B0D0C',
  backgroundColor: '#0B0D0C',
  // Flexible base URL: respects environment variable if defined, otherwise empty string for relative paths
  baseUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) || '',
  apiUrl: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || '',
};
