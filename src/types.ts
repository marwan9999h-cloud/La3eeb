export type GameScreenType =
  | 'home'
  | 'setup_players'
  | 'setup_rules'
  | 'round_intro'
  | 'pass_device_privacy'
  | 'player_search'
  | 'player_confirm'
  | 'ready_pass_back'
  | 'game_screen'
  | 'round_result'
  | 'cycle_summary'
  | 'game_over';

export type GameScreen = GameScreenType;

export interface Player {
  id: string;
  name: string;
  score: number;
  correctGuesses: number;
  roundsAsPicker: number;
  totalQuestionsUsed: number;
}

export interface GameSettings {
  questionsPerPlayer: number;
  guessesPerPlayer: number;
  timerDuration: number; // 0 = no timer (default), 60, 120, 300, 600
}

export type RoundEndReason =
  | 'correct_guess'
  | 'all_guesses_used'
  | 'timer_expired'
  | 'manual_end';

export interface PlayerCandidate {
  id: string;
  name: string;
  displayName: string;
  nationality: string;
  position: string;
  currentClubOrLast: string;
  isRetired?: boolean;
  eraOrNote?: string;
}

export interface PlayerProfile {
  playerName: string;
  displayName: string;
  aliases: string[];
  nationality: string;
  birthDate?: string;
  age?: string | number;
  shirtNumber?: string | number;
  position: string;
  isRetired: boolean;
  /** false when the retired/current status was not stated by any source. Omitted means known. */
  isRetiredKnown?: boolean;
  currentClub?: string;
  lastClub?: string;
  clubs: string[];
  leagues: string[];
  transfers?: string[];
  careerTimeline?: string[];
  nationalTeam: string;
  internationalCaps?: string | number;
  internationalGoals?: string | number;
  internationalTournaments?: string[];
  leagueTitles?: string[];
  cups?: string[];
  internationalTrophies?: string[];
  individualAwards?: string[];
  trophies: string[];
  appearances?: string | number;
  goals?: string | number;
  assists?: string | number;
  keyStats: string[];
  careerFacts: string[];
  notableTeammates?: string[];
  notableManagers?: string[];
  importantMatches?: string[];
  verifiedFacts: string[];
  photoUrl?: string;
  researchMode?: 'local_db' | 'ai_knowledge' | 'unavailable';
  verification?: 'verified' | 'unverified';
  sources?: Array<{ uri: string; title: string }>;
  isCustomOrSecret?: boolean;
}

export interface RoundHistoryEntry {
  roundNumber: number;
  pickerId: string;
  pickerName: string;
  playerName: string;
  playerDisplayName: string;
  winnerId: string | null;
  winnerName: string | null;
  pickerPoints: number;
  winnerPoints: number;
  questionsUsedByWinner: number;
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

