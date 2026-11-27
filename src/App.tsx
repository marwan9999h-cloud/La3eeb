import React, { useState, useEffect, useRef } from 'react';
import {
  GameScreenType,
  Player,
  GameSettings,
  PlayerCandidate,
  PlayerProfile,
  RoundEndReason,
} from './types';
import { Navbar } from './components/Navbar';
import { HomeScreen } from './components/HomeScreen';
import { SettingsModal } from './components/SettingsModal';
import { RulesModal } from './components/RulesModal';
import { DailyChallenge } from './components/DailyChallenge';
import { SetupPlayers } from './components/SetupPlayers';
import { SetupRules } from './components/SetupRules';
import { RoundIntro } from './components/RoundIntro';
import { PassDevicePrivacy } from './components/PassDevicePrivacy';
import { PlayerSearch } from './components/PlayerSearch';
import { PlayerConfirm } from './components/PlayerConfirm';
import { ReadyPassBack } from './components/ReadyPassBack';
import { GameScreen } from './components/GameScreen';
import { RoundResult } from './components/RoundResult';
import { CycleSummary } from './components/CycleSummary';
import { GameOver } from './components/GameOver';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';
import { sounds } from './utils/sound';
import {
  EXTRA_GUESS_COST,
  NOBODY_WON_PICKER_POINTS,
  calcCorrectGuessPoints,
  buildSecretProfile,
} from './utils/scoring';

const STORAGE_KEY = 'guess_the_player_game_state_v3';

const VALID_SCREENS: GameScreenType[] = [
  'home',
  'setup_players',
  'setup_rules',
  'round_intro',
  'pass_device_privacy',
  'player_search',
  'player_confirm',
  'ready_pass_back',
  'game_screen',
  'round_result',
  'cycle_summary',
  'game_over',
];

interface SafeStoredGameState {
  screen: GameScreenType;
  players: Player[];
  settings: GameSettings;
  currentRound: number;
  currentCycle: number;
  currentPickerIndex: number;
  selectedCandidate: PlayerCandidate | null;
  currentProfile: PlayerProfile | null;
  remainingQuestions: Record<string, number>;
  remainingGuesses: Record<string, number>;
  questionsUsedThisRound: Record<string, number>;
  extraGuessUsed: Record<string, boolean>;
  roundEndReason: RoundEndReason;
  roundWinnerId: string | null;
  winnerPoints: number;
  pickerPoints: number;
  roundEndsAt: number | null;
}

interface UndoSnapshot {
  players: Player[];
  remainingQuestions: Record<string, number>;
  remainingGuesses: Record<string, number>;
  questionsUsedThisRound: Record<string, number>;
  extraGuessUsed: Record<string, boolean>;
}

const DEFAULT_GAME_STATE: SafeStoredGameState = {
  screen: 'home',
  players: [],
  settings: {
    questionsPerPlayer: 2,
    guessesPerPlayer: 2,
    timerDuration: 0,
  },
  currentRound: 1,
  currentCycle: 1,
  currentPickerIndex: 0,
  selectedCandidate: null,
  currentProfile: null,
  remainingQuestions: {},
  remainingGuesses: {},
  questionsUsedThisRound: {},
  extraGuessUsed: {},
  roundEndReason: 'manual_end',
  roundWinnerId: null,
  winnerPoints: 0,
  pickerPoints: 0,
  roundEndsAt: null,
};

function loadStoredGameState(): SafeStoredGameState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_GAME_STATE;
  }

  // Remove obsolete v2 key without migration
  try {
    localStorage.removeItem('guess_the_player_game_state_v2');
  } catch {}

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw || raw === 'null' || raw === 'undefined' || raw.trim() === '') {
      return DEFAULT_GAME_STATE;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn('Failed to parse localStorage game state (corrupted JSON). Resetting storage.', parseErr);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return DEFAULT_GAME_STATE;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.warn('Invalid game state structure in localStorage. Resetting storage.');
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      return DEFAULT_GAME_STATE;
    }

    // 1. Sanitize Players
    let validPlayers: Player[] = [];
    if (Array.isArray(parsed.players)) {
      validPlayers = parsed.players
        .filter((p: any) => p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string')
        .map((p: any) => ({
          id: String(p.id),
          name: String(p.name || 'لاعب'),
          score: typeof p.score === 'number' && !isNaN(p.score) ? p.score : 0,
          correctGuesses: typeof p.correctGuesses === 'number' && !isNaN(p.correctGuesses) ? p.correctGuesses : 0,
          roundsAsPicker: typeof p.roundsAsPicker === 'number' && !isNaN(p.roundsAsPicker) ? p.roundsAsPicker : 0,
          totalQuestionsUsed: typeof p.totalQuestionsUsed === 'number' && !isNaN(p.totalQuestionsUsed) ? p.totalQuestionsUsed : 0,
        }));
    }

    // 2. Sanitize Settings
    const validSettings: GameSettings = {
      questionsPerPlayer:
        typeof parsed.settings?.questionsPerPlayer === 'number' && parsed.settings.questionsPerPlayer > 0
          ? parsed.settings.questionsPerPlayer
          : 2,
      guessesPerPlayer:
        typeof parsed.settings?.guessesPerPlayer === 'number' && parsed.settings.guessesPerPlayer > 0
          ? parsed.settings.guessesPerPlayer
          : 2,
      timerDuration:
        typeof parsed.settings?.timerDuration === 'number' && parsed.settings.timerDuration >= 0
          ? parsed.settings.timerDuration
          : 0,
    };

    // 3. Sanitize Cycle & Round
    const validRound =
      typeof parsed.currentRound === 'number' && !isNaN(parsed.currentRound) && parsed.currentRound >= 1
        ? Math.floor(parsed.currentRound)
        : 1;

    const validCycle =
      typeof parsed.currentCycle === 'number' && !isNaN(parsed.currentCycle) && parsed.currentCycle >= 1
        ? Math.floor(parsed.currentCycle)
        : 1;

    // 4. Sanitize Picker Index safely within range
    let validPickerIdx = 0;
    if (typeof parsed.currentPickerIndex === 'number' && !isNaN(parsed.currentPickerIndex)) {
      if (validPlayers.length > 0) {
        validPickerIdx = Math.max(0, Math.min(Math.floor(parsed.currentPickerIndex), validPlayers.length - 1));
      } else {
        validPickerIdx = 0;
      }
    }

    // 5. Sanitize Active Candidate and Profile
    const validCandidate: PlayerCandidate | null =
      parsed.selectedCandidate &&
      typeof parsed.selectedCandidate === 'object' &&
      typeof parsed.selectedCandidate.name === 'string'
        ? parsed.selectedCandidate
        : null;

    const validProfile: PlayerProfile | null =
      parsed.currentProfile &&
      typeof parsed.currentProfile === 'object' &&
      (typeof parsed.currentProfile.displayName === 'string' || typeof parsed.currentProfile.playerName === 'string')
        ? parsed.currentProfile
        : null;

    // 6. Sanitize Dictionaries
    const sanitizeNumberRecord = (rec: any): Record<string, number> => {
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return {};
      const clean: Record<string, number> = {};
      for (const [k, v] of Object.entries(rec)) {
        if (typeof v === 'number' && !isNaN(v)) {
          clean[k] = v;
        }
      }
      return clean;
    };

    const sanitizeBoolRecord = (rec: any): Record<string, boolean> => {
      if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return {};
      const clean: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(rec)) {
        if (typeof v === 'boolean') {
          clean[k] = v;
        }
      }
      return clean;
    };

    const validRemainingQuestions = sanitizeNumberRecord(parsed.remainingQuestions);
    const validRemainingGuesses = sanitizeNumberRecord(parsed.remainingGuesses);
    const validQuestionsUsed = sanitizeNumberRecord(parsed.questionsUsedThisRound);
    const validExtraGuess = sanitizeBoolRecord(parsed.extraGuessUsed);

    // 7. Sanitize Screen with state consistency validation
    let validScreen: GameScreenType = 'home';
    if (typeof parsed.screen === 'string' && VALID_SCREENS.includes(parsed.screen as GameScreenType)) {
      validScreen = parsed.screen as GameScreenType;
    }

    // Consistency Checks: Avoid stuck screens if underlying required data is absent
    const screensRequiringPlayers: GameScreenType[] = [
      'round_intro',
      'pass_device_privacy',
      'player_search',
      'player_confirm',
      'ready_pass_back',
      'game_screen',
      'round_result',
      'cycle_summary',
    ];

    if (screensRequiringPlayers.includes(validScreen) && validPlayers.length === 0) {
      console.warn('Game screen requires players but none found in localStorage. Resetting screen to home.');
      validScreen = 'home';
    }

    if (
      (validScreen === 'game_screen' || validScreen === 'ready_pass_back') &&
      !validProfile &&
      !validCandidate
    ) {
      console.warn('In game screen but no candidate or profile found in storage. Redirecting to player search.');
      validScreen = 'player_search';
    }

    const validEndReason: RoundEndReason = [
      'correct_guess',
      'all_guesses_used',
      'timer_expired',
      'manual_end',
    ].includes(parsed.roundEndReason)
      ? parsed.roundEndReason
      : 'manual_end';

    // 8. Sanitize round result fields
    let validRoundWinnerId: string | null = null;
    if (
      typeof parsed.roundWinnerId === 'string' &&
      validPlayers.some((p) => p.id === parsed.roundWinnerId)
    ) {
      validRoundWinnerId = parsed.roundWinnerId;
    }

    const validWinnerPoints =
      typeof parsed.winnerPoints === 'number' && !isNaN(parsed.winnerPoints) && parsed.winnerPoints >= 0
        ? Math.floor(parsed.winnerPoints)
        : 0;

    const validPickerPoints =
      typeof parsed.pickerPoints === 'number' && !isNaN(parsed.pickerPoints) && parsed.pickerPoints >= 0
        ? Math.floor(parsed.pickerPoints)
        : 0;

    let validRoundEndsAt: number | null = null;
    if (
      typeof parsed.roundEndsAt === 'number' &&
      !isNaN(parsed.roundEndsAt) &&
      parsed.roundEndsAt > 0
    ) {
      validRoundEndsAt = parsed.roundEndsAt;
    }

    // Check contradictory round_result state
    if (validScreen === 'round_result') {
      if (validEndReason === 'correct_guess' && !validRoundWinnerId) {
        console.warn('Contradictory round_result state with correct_guess but no valid winner. Redirecting to cycle_summary.');
        validScreen = 'cycle_summary';
      }
    }

    // Check game_screen with timer but null roundEndsAt
    if (
      validScreen === 'game_screen' &&
      validSettings.timerDuration > 0 &&
      validRoundEndsAt === null
    ) {
      validRoundEndsAt = Date.now() + validSettings.timerDuration * 1000;
    }

    return {
      screen: validScreen,
      players: validPlayers,
      settings: validSettings,
      currentRound: validRound,
      currentCycle: validCycle,
      currentPickerIndex: validPickerIdx,
      selectedCandidate: validCandidate,
      currentProfile: validProfile,
      remainingQuestions: validRemainingQuestions,
      remainingGuesses: validRemainingGuesses,
      questionsUsedThisRound: validQuestionsUsed,
      extraGuessUsed: validExtraGuess,
      roundEndReason: validEndReason,
      roundWinnerId: validRoundWinnerId,
      winnerPoints: validWinnerPoints,
      pickerPoints: validPickerPoints,
      roundEndsAt: validRoundEndsAt,
    };
  } catch (outerErr) {
    console.error('Unexpected error recovering game state from localStorage:', outerErr);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return DEFAULT_GAME_STATE;
  }
}

export const App: React.FC = () => {
  // Load and sanitize stored state once
  const [initialSavedState] = useState<SafeStoredGameState>(() => loadStoredGameState());

  // Navigation & Game State
  const [screen, setScreen] = useState<GameScreenType>(initialSavedState.screen);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Players & Settings
  const [players, setPlayers] = useState<Player[]>(initialSavedState.players);
  const [settings, setSettings] = useState<GameSettings>(initialSavedState.settings);

  // Cycle & Round tracking
  const [currentRound, setCurrentRound] = useState<number>(initialSavedState.currentRound);
  const [currentCycle, setCurrentCycle] = useState<number>(initialSavedState.currentCycle);
  const [currentPickerIndex, setCurrentPickerIndex] = useState<number>(initialSavedState.currentPickerIndex);

  // Active Round Data
  const [selectedCandidate, setSelectedCandidate] = useState<PlayerCandidate | null>(
    initialSavedState.selectedCandidate
  );
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile | null>(
    initialSavedState.currentProfile
  );

  // Per-round Resources Tracking
  const [remainingQuestions, setRemainingQuestions] = useState<Record<string, number>>(
    initialSavedState.remainingQuestions
  );
  const [remainingGuesses, setRemainingGuesses] = useState<Record<string, number>>(
    initialSavedState.remainingGuesses
  );
  const [questionsUsedThisRound, setQuestionsUsedThisRound] = useState<Record<string, number>>(
    initialSavedState.questionsUsedThisRound
  );
  const [extraGuessUsed, setExtraGuessUsed] = useState<Record<string, boolean>>(
    initialSavedState.extraGuessUsed
  );

  // Mirror refs for gameplay resources (stale closure protection)
  const remainingQuestionsRef = useRef<Record<string, number>>(initialSavedState.remainingQuestions);
  const remainingGuessesRef = useRef<Record<string, number>>(initialSavedState.remainingGuesses);
  const questionsUsedThisRoundRef = useRef<Record<string, number>>(initialSavedState.questionsUsedThisRound);
  const extraGuessUsedRef = useRef<Record<string, boolean>>(initialSavedState.extraGuessUsed);

  // Round Results Calculation
  const [roundWinnerId, setRoundWinnerId] = useState<string | null>(initialSavedState.roundWinnerId);
  const [winnerPoints, setWinnerPoints] = useState(initialSavedState.winnerPoints);
  const [pickerPoints, setPickerPoints] = useState(initialSavedState.pickerPoints);
  const [roundEndReason, setRoundEndReason] = useState<RoundEndReason>(initialSavedState.roundEndReason);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(initialSavedState.roundEndsAt);

  // Round resolved lock: false ONLY during active gameplay on game_screen
  const roundResolvedRef = useRef<boolean>(initialSavedState.screen !== 'game_screen');

  // Undo stack & count (up to 5 snapshots)
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const [undoCount, setUndoCount] = useState<number>(0);

  // Screen data validation effect to prevent white screen
  useEffect(() => {
    const gameplayScreens: GameScreenType[] = [
      'round_intro',
      'pass_device_privacy',
      'player_search',
      'player_confirm',
      'ready_pass_back',
      'game_screen',
      'round_result',
      'cycle_summary',
    ];

    if (gameplayScreens.includes(screen) && players.length === 0) {
      setScreen('home');
      return;
    }

    if (screen === 'player_confirm' && selectedCandidate === null) {
      setScreen('player_search');
      return;
    }

    if (screen === 'game_screen' && currentProfile === null) {
      setScreen('player_search');
      return;
    }

    if (screen === 'round_result' && currentProfile === null) {
      setScreen('cycle_summary');
      return;
    }
  }, [screen, players.length, selectedCandidate, currentProfile]);

  // Sync game state to localStorage defensively
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const stateToSave = {
        screen,
        players,
        settings,
        currentRound,
        currentCycle,
        currentPickerIndex,
        selectedCandidate,
        currentProfile,
        remainingQuestions,
        remainingGuesses,
        questionsUsedThisRound,
        extraGuessUsed,
        roundEndReason,
        roundWinnerId,
        winnerPoints,
        pickerPoints,
        roundEndsAt,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (saveErr) {
      console.warn('Failed to persist game state to localStorage (quota exceeded or storage disabled):', saveErr);
    }
  }, [
    screen,
    players,
    settings,
    currentRound,
    currentCycle,
    currentPickerIndex,
    selectedCandidate,
    currentProfile,
    remainingQuestions,
    remainingGuesses,
    questionsUsedThisRound,
    extraGuessUsed,
    roundEndReason,
    roundWinnerId,
    winnerPoints,
    pickerPoints,
    roundEndsAt,
  ]);

  const currentPicker = players[currentPickerIndex] || {
    id: 'p1',
    name: 'لاعب 1',
    score: 0,
    correctGuesses: 0,
    roundsAsPicker: 0,
    totalQuestionsUsed: 0,
  };

  const guessers = players.filter((_, idx) => idx !== currentPickerIndex);
  const roundWinner = players.find((p) => p.id === roundWinnerId) ?? null;

  const pushUndoSnapshot = () => {
    const snapshot: UndoSnapshot = {
      players: players.map((p) => ({ ...p })),
      remainingQuestions: { ...remainingQuestionsRef.current },
      remainingGuesses: { ...remainingGuessesRef.current },
      questionsUsedThisRound: { ...questionsUsedThisRoundRef.current },
      extraGuessUsed: { ...extraGuessUsedRef.current },
    };
    const nextStack = [...undoStackRef.current, snapshot].slice(-5);
    undoStackRef.current = nextStack;
    setUndoCount(nextStack.length);
  };

  const clearUndoStack = () => {
    undoStackRef.current = [];
    setUndoCount(0);
  };

  const handleUndo = () => {
    if (roundResolvedRef.current || undoStackRef.current.length === 0) return;
    const lastSnapshot = undoStackRef.current.pop();
    if (!lastSnapshot) return;

    setUndoCount(undoStackRef.current.length);

    remainingQuestionsRef.current = { ...lastSnapshot.remainingQuestions };
    remainingGuessesRef.current = { ...lastSnapshot.remainingGuesses };
    questionsUsedThisRoundRef.current = { ...lastSnapshot.questionsUsedThisRound };
    extraGuessUsedRef.current = { ...lastSnapshot.extraGuessUsed };

    setPlayers(lastSnapshot.players.map((p) => ({ ...p })));
    setRemainingQuestions(remainingQuestionsRef.current);
    setRemainingGuesses(remainingGuessesRef.current);
    setQuestionsUsedThisRound(questionsUsedThisRoundRef.current);
    setExtraGuessUsed(extraGuessUsedRef.current);

    sounds.playClick();
  };

  // 1. Setup Players -> Setup Rules
  const handlePlayersSetup = (playerNames: string[]) => {
    const initializedPlayers: Player[] = playerNames.map((name, i) => ({
      id: `player-${i + 1}-${Date.now()}`,
      name,
      score: 0,
      correctGuesses: 0,
      roundsAsPicker: 0,
      totalQuestionsUsed: 0,
    }));
    setPlayers(initializedPlayers);
    setScreen('setup_rules');
  };

  // 2. Setup Rules -> Start Round 1
  const handleStartGame = (gameSettings: GameSettings) => {
    roundResolvedRef.current = true;
    clearUndoStack();
    setSettings(gameSettings);
    setCurrentRound(1);
    setCurrentCycle(1);
    setCurrentPickerIndex(0);
    setRoundEndsAt(null);
    initRoundResources(gameSettings, players, 0);
    setScreen('round_intro');
  };

  // Initialize resources for a new round
  const initRoundResources = (
    gameSettings: GameSettings,
    allPlayers: Player[],
    pickerIdx: number
  ) => {
    const qMap: Record<string, number> = {};
    const gMap: Record<string, number> = {};
    const usedMap: Record<string, number> = {};
    const extraMap: Record<string, boolean> = {};

    allPlayers.forEach((p, idx) => {
      if (idx !== pickerIdx) {
        qMap[p.id] = gameSettings.questionsPerPlayer;
        gMap[p.id] = gameSettings.guessesPerPlayer;
        usedMap[p.id] = 0;
        extraMap[p.id] = false;
      }
    });

    remainingQuestionsRef.current = qMap;
    remainingGuessesRef.current = gMap;
    questionsUsedThisRoundRef.current = usedMap;
    extraGuessUsedRef.current = extraMap;

    setRemainingQuestions(qMap);
    setRemainingGuesses(gMap);
    setQuestionsUsedThisRound(usedMap);
    setExtraGuessUsed(extraMap);
    setSelectedCandidate(null);
    setCurrentProfile(null);
    setRoundWinnerId(null);
    setWinnerPoints(0);
    setPickerPoints(0);
    setRoundEndsAt(null);
    setRoundEndReason('manual_end');
    clearUndoStack();
  };

  // 3. Round Intro -> Pass Device Privacy
  const handleProceedToPrivacy = () => {
    setScreen('pass_device_privacy');
  };

  // 4. Pass Device Privacy -> Player Search
  const handleConfirmPrivacy = () => {
    setScreen('player_search');
  };

  // 5. Player Candidate Selected -> Confirm Player
  const handleSelectCandidate = (candidate: PlayerCandidate) => {
    setSelectedCandidate(candidate);
    setScreen('player_confirm');
  };

  // 5b. Direct Secret In-Mind Player (Offline / Zero-Search) -> Ready Screen
  const handleSelectSecretPlayer = (customName?: string) => {
    const secretProfile: PlayerProfile = buildSecretProfile(customName);

    setCurrentProfile(secretProfile);
    setSelectedCandidate(null);
    setScreen('ready_pass_back');
  };

  // 6. Player Confirmed & Profile Ready -> Ready Screen
  const handleProfileReady = (profile: PlayerProfile) => {
    setCurrentProfile(profile);
    setScreen('ready_pass_back');
  };

  // 7. Ready -> Game Screen Active
  const handleStartGameScreen = () => {
    roundResolvedRef.current = false;
    clearUndoStack();
    const endsAt = settings.timerDuration > 0 ? Date.now() + settings.timerDuration * 1000 : null;
    setRoundEndsAt(endsAt);
    setScreen('game_screen');
  };

  // Live in-game handlers
  const handleDeductQuestion = (playerId: string) => {
    if (roundResolvedRef.current) return;
    const currentQ = remainingQuestionsRef.current[playerId] ?? 0;
    if (currentQ <= 0) return;

    pushUndoSnapshot();

    const nextQ = currentQ - 1;
    const nextUsed = (questionsUsedThisRoundRef.current[playerId] ?? 0) + 1;

    remainingQuestionsRef.current = {
      ...remainingQuestionsRef.current,
      [playerId]: nextQ,
    };
    questionsUsedThisRoundRef.current = {
      ...questionsUsedThisRoundRef.current,
      [playerId]: nextUsed,
    };

    sounds.playDeduct();
    setRemainingQuestions(remainingQuestionsRef.current);
    setQuestionsUsedThisRound(questionsUsedThisRoundRef.current);
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, totalQuestionsUsed: p.totalQuestionsUsed + 1 }
          : p
      )
    );
  };

  const handleDeductGuess = (playerId: string) => {
    if (roundResolvedRef.current) return;
    const currentG = remainingGuessesRef.current[playerId] ?? 0;
    if (currentG <= 0) return;

    pushUndoSnapshot();

    const nextG = currentG - 1;
    remainingGuessesRef.current = {
      ...remainingGuessesRef.current,
      [playerId]: nextG,
    };

    sounds.playDeduct();
    setRemainingGuesses(remainingGuessesRef.current);

    // Check if ALL guessers have 0 guesses left from ref immediately
    const allExhausted = guessers.every(
      (g) => (remainingGuessesRef.current[g.id] ?? 0) <= 0
    );

    if (allExhausted) {
      handleEndRoundNobodyWon('all_guesses_used');
    }
  };

  // Extra Guess purchase handler
  const handleBuyExtraGuess = (playerId: string) => {
    if (roundResolvedRef.current) return;
    if (extraGuessUsedRef.current[playerId]) return;

    const targetPlayer = players.find((p) => p.id === playerId);
    if (!targetPlayer || targetPlayer.score < EXTRA_GUESS_COST) return;

    pushUndoSnapshot();

    // Update extraGuessUsedRef immediately before anything else
    extraGuessUsedRef.current = {
      ...extraGuessUsedRef.current,
      [playerId]: true,
    };

    const nextG = (remainingGuessesRef.current[playerId] ?? 0) + 1;
    remainingGuessesRef.current = {
      ...remainingGuessesRef.current,
      [playerId]: nextG,
    };

    setExtraGuessUsed(extraGuessUsedRef.current);
    setRemainingGuesses(remainingGuessesRef.current);

    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, score: Math.max(0, p.score - EXTRA_GUESS_COST) }
          : p
      )
    );
  };

  // Correct guess logic
  const handleCorrectGuess = (winnerId: string) => {
    if (roundResolvedRef.current) return;
    const isGuesser = guessers.some((g) => g.id === winnerId);
    if (!isGuesser) return;

    // Safety guard: Player must have at least 1 remaining guess
    const guessesLeft = remainingGuessesRef.current[winnerId] ?? 0;
    if (guessesLeft <= 0) return;

    // Lock round synchronously before state updates
    roundResolvedRef.current = true;

    sounds.playCorrectGuess();
    const winner = players.find((p) => p.id === winnerId);
    if (!winner) return;

    const questionsUsed = questionsUsedThisRoundRef.current[winnerId] || 0;
    const winnerTotalPts = calcCorrectGuessPoints(questionsUsed);
    const pickerTotalPts = 0; // Picker gets 0 if another player guessed correctly!

    setRoundWinnerId(winnerId);
    setWinnerPoints(winnerTotalPts);
    setPickerPoints(pickerTotalPts);
    setRoundEndReason('correct_guess');

    // Update scores
    setPlayers((prev) =>
      prev.map((p, idx) => {
        if (p.id === winnerId) {
          return {
            ...p,
            score: p.score + winnerTotalPts,
            correctGuesses: p.correctGuesses + 1,
          };
        }
        if (idx === currentPickerIndex) {
          return {
            ...p,
            score: p.score + pickerTotalPts,
            roundsAsPicker: p.roundsAsPicker + 1,
          };
        }
        return p;
      })
    );

    setScreen('round_result');
  };

  // Nobody won logic (expired timer, all guesses exhausted, or manual end)
  const handleEndRoundNobodyWon = (reason: RoundEndReason = 'manual_end') => {
    if (roundResolvedRef.current) return;
    // Lock round synchronously before state updates
    roundResolvedRef.current = true;

    sounds.playNobodyWon();
    const pickerTotalPts = NOBODY_WON_PICKER_POINTS; // Picker gets +8 if nobody guesses!
    setRoundWinnerId(null);
    setWinnerPoints(0);
    setPickerPoints(pickerTotalPts);
    setRoundEndReason(reason);

    // Update picker score
    setPlayers((prev) =>
      prev.map((p, idx) => {
        if (idx === currentPickerIndex) {
          return {
            ...p,
            score: p.score + pickerTotalPts,
            roundsAsPicker: p.roundsAsPicker + 1,
          };
        }
        return p;
      })
    );

    setScreen('round_result');
  };

  // Advance to next round or cycle summary
  const isEndOfCycle = players.length > 0 && currentPickerIndex === players.length - 1;
  const nextPickerIdx = players.length > 0 ? (currentPickerIndex + 1) % players.length : 0;
  const nextPicker = players[nextPickerIdx];

  const handleNextRound = () => {
    roundResolvedRef.current = true;
    clearUndoStack();
    const nextIdx = players.length > 0 ? (currentPickerIndex + 1) % players.length : 0;
    setCurrentPickerIndex(nextIdx);
    setCurrentRound((prev) => prev + 1);
    setRoundEndsAt(null);
    initRoundResources(settings, players, nextIdx);
    setScreen('round_intro');
  };

  const handleShowCycleSummary = () => {
    setScreen('cycle_summary');
  };

  const handleContinueNextCycle = () => {
    roundResolvedRef.current = true;
    clearUndoStack();
    setCurrentCycle((prev) => prev + 1);
    setCurrentPickerIndex(0);
    setCurrentRound((prev) => prev + 1);
    setRoundEndsAt(null);
    initRoundResources(settings, players, 0);
    setScreen('round_intro');
  };

  const handleFinishGame = () => {
    setScreen('game_over');
  };

  const handleResetGame = () => {
    roundResolvedRef.current = true;
    sounds.playClick();
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('guess_the_player_game_state_v2');
    } catch {}
    clearUndoStack();
    setScreen('home');
    setPlayers([]);
    setCurrentRound(1);
    setCurrentCycle(1);
    setCurrentPickerIndex(0);
    setSelectedCandidate(null);
    setCurrentProfile(null);
    setRoundWinnerId(null);
    setWinnerPoints(0);
    setPickerPoints(0);
    setRoundEndsAt(null);
    remainingQuestionsRef.current = {};
    remainingGuessesRef.current = {};
    questionsUsedThisRoundRef.current = {};
    extraGuessUsedRef.current = {};
    setRemainingQuestions({});
    setRemainingGuesses({});
    setQuestionsUsedThisRound({});
    setExtraGuessUsed({});
  };

  return (
    <div className="min-h-screen bg-[#0B0D0C] text-[#DDE5DF] flex flex-col selection:bg-[#35C759] selection:text-[#0B0D0C]">
      {/* Top Navigation */}
      <Navbar
        onResetGame={handleResetGame}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onGoHome={() => setScreen('home')}
        currentRound={currentRound}
        isGameActive={
          screen !== 'home' &&
          screen !== 'setup_players' &&
          screen !== 'setup_rules' &&
          screen !== 'game_over'
        }
      />

      {/* Rules Quick Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
      <DailyChallenge isOpen={isDailyOpen} onClose={() => setIsDailyOpen(false)} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onResetAllData={handleResetGame}
        isGameActive={
          screen !== 'home' &&
          screen !== 'setup_players' &&
          screen !== 'setup_rules' &&
          screen !== 'game_over'
        }
      />

      {/* Non-intrusive Offline & Reconnect Monitor */}
      <OfflineBanner />

      {/* Gentle Service Worker Update Notification */}
      <PWAUpdateNotification
        isGameActive={
          screen !== 'home' &&
          screen !== 'setup_players' &&
          screen !== 'setup_rules' &&
          screen !== 'game_over'
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-center py-4">
        {screen === 'home' && (
          <HomeScreen
            onStartGame={() => setScreen('setup_players')}
            onOpenRules={() => setIsRulesModalOpen(true)}
            onOpenDaily={() => setIsDailyOpen(true)}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        )}

        {screen === 'setup_players' && (
          <SetupPlayers
            onContinue={handlePlayersSetup}
            onBack={() => setScreen('home')}
          />
        )}

        {screen === 'setup_rules' && (
          <SetupRules
            onBack={() => setScreen('setup_players')}
            onStartGame={handleStartGame}
            playersCount={players.length}
          />
        )}

        {screen === 'round_intro' && (
          <RoundIntro
            roundNumber={currentRound}
            pickerName={currentPicker.name}
            onProceedToPrivacy={handleProceedToPrivacy}
          />
        )}

        {screen === 'pass_device_privacy' && (
          <PassDevicePrivacy
            pickerName={currentPicker.name}
            onConfirmPrivacy={handleConfirmPrivacy}
          />
        )}

        {screen === 'player_search' && (
          <PlayerSearch
            pickerName={currentPicker.name}
            onSelectCandidate={handleSelectCandidate}
            onSelectSecretInMind={handleSelectSecretPlayer}
          />
        )}

        {screen === 'player_confirm' && selectedCandidate && (
          <PlayerConfirm
            candidate={selectedCandidate}
            pickerName={currentPicker.name}
            onProfileReady={handleProfileReady}
            onReject={() => setScreen('player_search')}
          />
        )}

        {screen === 'ready_pass_back' && (
          <ReadyPassBack
            pickerName={currentPicker.name}
            onStartGameScreen={handleStartGameScreen}
          />
        )}

        {screen === 'game_screen' && currentProfile && (
          <GameScreen
            roundNumber={currentRound}
            picker={currentPicker}
            guessers={guessers}
            profile={currentProfile}
            remainingQuestions={remainingQuestions}
            remainingGuesses={remainingGuesses}
            questionsUsed={questionsUsedThisRound}
            extraGuessUsed={extraGuessUsed}
            roundEndsAt={roundEndsAt}
            undoCount={undoCount}
            onUndo={handleUndo}
            onDeductQuestion={handleDeductQuestion}
            onDeductGuess={handleDeductGuess}
            onBuyExtraGuess={handleBuyExtraGuess}
            onCorrectGuess={handleCorrectGuess}
            onEndRoundNobodyWon={handleEndRoundNobodyWon}
          />
        )}

        {screen === 'round_result' && currentProfile && (
          <RoundResult
            roundNumber={currentRound}
            picker={currentPicker}
            winner={roundWinner}
            profile={currentProfile}
            pickerPoints={pickerPoints}
            winnerPoints={winnerPoints}
            questionsUsedByWinner={
              roundWinner ? questionsUsedThisRound[roundWinner.id] || 0 : 0
            }
            nextPickerName={nextPicker?.name || 'اللاعب التالي'}
            isEndOfCycle={isEndOfCycle}
            roundEndReason={roundEndReason}
            onNextRound={handleNextRound}
            onShowCycleSummary={handleShowCycleSummary}
          />
        )}

        {screen === 'cycle_summary' && (
          <CycleSummary
            cycleNumber={currentCycle}
            players={players}
            onContinueNextCycle={handleContinueNextCycle}
            onFinishGame={handleFinishGame}
          />
        )}

        {screen === 'game_over' && (
          <GameOver
            players={players}
            totalRounds={currentRound}
            onPlayAgain={handleResetGame}
          />
        )}
      </main>
    </div>
  );
};

export default App;
