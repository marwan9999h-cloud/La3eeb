import { computeAge } from './playerDatabase';

export function normalizeProfile(
  raw: any,
  fallbackNames?: { playerName?: string; displayName?: string }
): any {
  const p = raw || {};
  const isRetired = Boolean(p.isRetired);

  // Clean arrays: max 30 items, each item string trimmed and sliced to 200 chars
  const cleanArray = (arr: any, maxLen = 30): string[] => {
    if (!Array.isArray(arr)) return [];
    return Array.from(
      new Set(
        arr
          .map((item) => (typeof item === 'string' ? item.trim().slice(0, 200) : ''))
          .filter((item) => item.length > 0 && item !== 'غير متاح')
      )
    ).slice(0, maxLen);
  };

  const cleanString = (val: any, fallback = 'غير متاح'): string => {
    if (typeof val === 'string' && val.trim() !== '') return val.trim().slice(0, 200);
    if (typeof val === 'number' && !isNaN(val)) return String(val).slice(0, 200);
    return fallback;
  };

  const birthDate =
    typeof p.birthDate === 'string' && p.birthDate.trim() !== ''
      ? p.birthDate.trim().slice(0, 200)
      : undefined;
  const calculatedAge = computeAge(birthDate, isRetired);
  const finalAge =
    calculatedAge ||
    (typeof p.age === 'string' || typeof p.age === 'number'
      ? cleanString(p.age, 'غير متاح')
      : undefined);

  const researchMode: 'local_db' | 'ai_knowledge' | 'unavailable' =
    p.researchMode === 'local_db' || p.researchMode === 'ai_knowledge' || p.researchMode === 'unavailable'
      ? p.researchMode
      : 'ai_knowledge';

  return {
    playerName: cleanString(p.playerName, fallbackNames?.playerName || 'غير متاح'),
    displayName: cleanString(p.displayName, fallbackNames?.displayName || 'غير متاح'),
    aliases: cleanArray(p.aliases, 15),
    nationality: cleanString(p.nationality, 'غير متاح'),
    birthDate,
    age: finalAge && finalAge !== 'غير متاح' ? finalAge : undefined,
    shirtNumber:
      p.shirtNumber && String(p.shirtNumber).trim() !== '' && String(p.shirtNumber) !== 'غير متاح'
        ? cleanString(p.shirtNumber, 'غير متاح')
        : undefined,
    position: cleanString(p.position, 'غير متاح'),
    isRetired,
    currentClub: isRetired ? undefined : cleanString(p.currentClub, '') || undefined,
    lastClub: cleanString(p.lastClub, '') || undefined,
    clubs: cleanArray(p.clubs, 30),
    leagues: cleanArray(p.leagues, 30),
    transfers: cleanArray(p.transfers, 30),
    careerTimeline: cleanArray(p.careerTimeline, 30),
    nationalTeam: cleanString(p.nationalTeam, '') || undefined,
    internationalCaps:
      p.internationalCaps &&
      String(p.internationalCaps).trim() !== '' &&
      String(p.internationalCaps) !== 'غير متاح'
        ? cleanString(p.internationalCaps, 'غير متاح')
        : undefined,
    internationalGoals:
      p.internationalGoals &&
      String(p.internationalGoals).trim() !== '' &&
      String(p.internationalGoals) !== 'غير متاح'
        ? cleanString(p.internationalGoals, 'غير متاح')
        : undefined,
    internationalTournaments: cleanArray(p.internationalTournaments, 30),
    leagueTitles: cleanArray(p.leagueTitles, 30),
    cups: cleanArray(p.cups, 30),
    internationalTrophies: cleanArray(p.internationalTrophies, 30),
    individualAwards: cleanArray(p.individualAwards, 30),
    trophies: cleanArray(p.trophies, 30),
    appearances:
      p.appearances && String(p.appearances).trim() !== '' && String(p.appearances) !== 'غير متاح'
        ? cleanString(p.appearances, 'غير متاح')
        : undefined,
    goals:
      p.goals && String(p.goals).trim() !== '' && String(p.goals) !== 'غير متاح'
        ? cleanString(p.goals, 'غير متاح')
        : undefined,
    assists:
      p.assists && String(p.assists).trim() !== '' && String(p.assists) !== 'غير متاح'
        ? cleanString(p.assists, 'غير متاح')
        : undefined,
    keyStats: cleanArray(p.keyStats, 30),
    careerFacts: cleanArray(p.careerFacts, 30),
    notableTeammates: cleanArray(p.notableTeammates, 30),
    notableManagers: cleanArray(p.notableManagers, 30),
    importantMatches: cleanArray(p.importantMatches, 30),
    verifiedFacts: cleanArray(p.verifiedFacts, 30),
    researchMode,
    sources: researchMode === 'local_db' && Array.isArray(p.sources) ? p.sources : [],
  };
}

export function createUnavailableProfile(names: {
  playerName?: string;
  displayName?: string;
  nationality?: string;
  position?: string;
  isRetired?: boolean;
  aliases?: string[];
}): any {
  const pName = names.playerName || 'غير متاح';
  const dName = names.displayName || 'غير متاح';
  const defaultAliases = [dName, pName].filter((n) => n && n !== 'غير متاح');
  return {
    playerName: pName,
    displayName: dName,
    aliases: names.aliases && names.aliases.length > 0 ? names.aliases : defaultAliases,
    nationality: names.nationality || 'غير متاح',
    position: names.position || 'غير متاح',
    isRetired: names.isRetired ?? false,
    clubs: [],
    leagues: [],
    trophies: [],
    keyStats: [],
    careerFacts: [],
    verifiedFacts: [],
    researchMode: 'unavailable',
    sources: [],
  };
}
