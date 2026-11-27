import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  BookOpen,
  CheckCircle,
  Timer,
  PlusCircle,
  Sparkles,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';
import { Player, PlayerProfile, RoundEndReason } from '../types';
import { sounds } from '../utils/sound';
import {
  EXTRA_GUESS_COST,
  NOBODY_WON_PICKER_POINTS,
  calcCorrectGuessPoints,
} from '../utils/scoring';
import { PlayerProfileModal } from './PlayerProfileModal';
import { AiAssistantModal } from './AiAssistantModal';
import { HINTS_PER_PLAYER, type HintCard } from '../utils/hints';

interface GameScreenProps {
  roundNumber: number;
  picker: Player;
  guessers: Player[];
  profile: PlayerProfile;
  remainingQuestions: Record<string, number>;
  remainingGuesses: Record<string, number>;
  questionsUsed: Record<string, number>;
  extraGuessUsed: Record<string, boolean>;
  roundEndsAt: number | null;
  undoCount: number;
  hintDeck: HintCard[];
  revealedHints: HintCard[];
  hintsUsed: Record<string, number>;
  onUndo: () => void;
  onUseHint: (playerId: string) => void;
  onDeductQuestion: (playerId: string) => void;
  onDeductGuess: (playerId: string) => void;
  onBuyExtraGuess: (playerId: string) => void;
  onCorrectGuess: (winnerId: string) => void;
  onEndRoundNobodyWon: (reason?: RoundEndReason) => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  roundNumber,
  picker,
  guessers,
  profile,
  remainingQuestions,
  remainingGuesses,
  questionsUsed,
  extraGuessUsed,
  roundEndsAt,
  undoCount,
  hintDeck,
  revealedHints,
  hintsUsed,
  onUndo,
  onUseHint,
  onDeductQuestion,
  onDeductGuess,
  onBuyExtraGuess,
  onCorrectGuess,
  onEndRoundNobodyWon,
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showConfirmEndManual, setShowConfirmEndManual] = useState(false);
  const [confirmWinnerPlayer, setConfirmWinnerPlayer] = useState<Player | null>(null);
  const [confirmLastGuessPlayerId, setConfirmLastGuessPlayerId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Time-up state disabling all gameplay actions
  const [timeUp, setTimeUp] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (roundEndsAt === null) return 0;
    return Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
  });

  const hasPlayedWarningRef = useRef(false);
  const hasEndedRoundRef = useRef(false);
  const timerExpiredTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActionTimestampRef = useRef<Record<string, number>>({});

  const isAnyModalOpen =
    showProfileModal ||
    showAiModal ||
    showConfirmEndManual ||
    confirmWinnerPlayer !== null ||
    confirmLastGuessPlayerId !== null;

  // Screen Wake Lock API to prevent phone screen from locking during the round
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isMounted) {
        try {
          const lock = await (navigator as any).wakeLock.request('screen');
          if (isMounted) {
            wakeLockRef.current = lock;
            lock.addEventListener('release', () => {
              wakeLockRef.current = null;
            });
          } else {
            lock.release().catch(() => {});
          }
        } catch {
          // Silent catch - ignore rejection
        }
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // Real-time Timer management
  useEffect(() => {
    if (roundEndsAt === null) {
      setTimeRemaining(0);
      setTimeUp(false);
      return;
    }

    hasPlayedWarningRef.current = false;
    hasEndedRoundRef.current = false;

    const initialRem = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
    setTimeRemaining(initialRem);

    if (initialRem <= 0) {
      hasEndedRoundRef.current = true;
      setTimeUp(true);
      onEndRoundNobodyWon('timer_expired');
      return;
    }

    const checkTimer = () => {
      const rem = Math.max(0, Math.ceil((roundEndsAt - Date.now()) / 1000));
      setTimeRemaining(rem);

      if (rem <= 10 && rem > 0 && !hasPlayedWarningRef.current) {
        hasPlayedWarningRef.current = true;
        sounds.playTimerWarning();
      }

      if (rem === 0 && !hasEndedRoundRef.current) {
        hasEndedRoundRef.current = true;
        setTimeUp(true);
        timerExpiredTimeoutRef.current = setTimeout(() => {
          onEndRoundNobodyWon('timer_expired');
        }, 1500);
      }
    };

    const interval = setInterval(checkTimer, 250);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkTimer();
      }
    };
    const onWindowFocus = () => checkTimer();
    const onPageShow = () => checkTimer();

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('pageshow', onPageShow);
      if (timerExpiredTimeoutRef.current) {
        clearTimeout(timerExpiredTimeoutRef.current);
        timerExpiredTimeoutRef.current = null;
      }
    };
  }, [roundEndsAt, onEndRoundNobodyWon]);

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    };
  }, []);

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const showFeedbackToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimeoutRef.current = null;
    }, 3000);
  };

  const isDebounced = (actionKey: string): boolean => {
    const now = Date.now();
    const last = lastActionTimestampRef.current[actionKey] || 0;
    if (now - last < 400) {
      return true;
    }
    lastActionTimestampRef.current[actionKey] = now;
    return false;
  };

  const handleDeductQuestionClick = (playerId: string) => {
    if (timeUp || isAnyModalOpen) return;
    if (isDebounced(`q-${playerId}`)) return;
    onDeductQuestion(playerId);
  };

  const handleDeductGuessClick = (player: Player) => {
    if (timeUp || isAnyModalOpen) return;
    if (isDebounced(`g-${player.id}`)) return;

    // Check if this guess deduction will exhaust ALL guessers' guesses
    const currentForThis = remainingGuesses[player.id] ?? 0;
    const nextForThis = Math.max(0, currentForThis - 1);

    if (nextForThis === 0) {
      const allOthersExhausted = guessers.every((g) => {
        if (g.id === player.id) return true;
        return (remainingGuesses[g.id] ?? 0) <= 0;
      });

      if (allOthersExhausted) {
        setConfirmLastGuessPlayerId(player.id);
        return;
      }
    }

    onDeductGuess(player.id);
  };

  const handleBuyExtraGuessClick = (player: Player) => {
    if (timeUp || isAnyModalOpen) return;
    if (isDebounced(`extra-${player.id}`)) return;

    if (extraGuessUsed[player.id]) {
      sounds.playDeduct();
      showFeedbackToast('إنت استخدمت التخمينة الإضافية في الجولة دي.');
      return;
    }
    if (player.score < EXTRA_GUESS_COST) {
      sounds.playDeduct();
      showFeedbackToast('مش معاك نقاط كفاية للتخمينة الإضافية.');
      return;
    }

    sounds.playPurchase();
    onBuyExtraGuess(player.id);
    showFeedbackToast(`اتضافتلك تخمينة 🎯 (${player.name})`);
  };

  const handleWinnerClick = (player: Player) => {
    if (timeUp || isAnyModalOpen) return;
    setConfirmWinnerPlayer(player);
  };

  const handleUseHintClick = (player: Player) => {
    if (timeUp || isAnyModalOpen) return;
    if (isDebounced(`hint-${player.id}`)) return;

    const used = hintsUsed[player.id] ?? 0;
    if (used >= HINTS_PER_PLAYER) {
      sounds.playDeduct();
      showFeedbackToast('كل مخمّن عنده تلميح واحد بس في الجولة.');
      return;
    }
    if (revealedHints.length >= hintDeck.length) {
      sounds.playDeduct();
      showFeedbackToast('مفيش تلميحات إضافية متاحة للاعب ده.');
      return;
    }

    sounds.playSelect();
    onUseHint(player.id);
  };

  const handleConfirmWinner = () => {
    if (!confirmWinnerPlayer) return;
    const winnerId = confirmWinnerPlayer.id;
    setConfirmWinnerPlayer(null);
    sounds.playSuccess();
    onCorrectGuess(winnerId);
  };

  const handleConfirmLastGuess = () => {
    if (!confirmLastGuessPlayerId) return;
    const pId = confirmLastGuessPlayerId;
    setConfirmLastGuessPlayerId(null);
    onDeductGuess(pId);
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-3 sm:py-4 px-4 space-y-4 select-none">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#15231A] border border-[#22C55E] text-[#EEF2EF] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-sm font-black animate-bounce">
          <Sparkles className="w-4 h-4 text-[#22C55E]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Status */}
      <div className="bg-[#131815] p-4 sm:p-5 rounded-3xl border border-[#212823] shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-[#22C55E] uppercase tracking-wider bg-[#22C55E]/10 px-2.5 py-0.5 rounded-full">
              الجولة {roundNumber}
            </span>
            {roundEndsAt !== null && (
              <span
                id="round-timer-display"
                className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition-colors ${
                  timeRemaining <= 10
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/80 animate-pulse'
                    : timeRemaining <= 30
                    ? 'bg-amber-950/50 text-amber-300 border border-amber-800/50'
                    : 'bg-[#171E1A] text-amber-400 border border-[#212823]'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span className="tabular-nums tracking-wide">{formatTime(timeRemaining)}</span>
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#EEF2EF] mt-1">
            صاحب الجولة: <span className="text-[#22C55E]">{picker.name}</span> 👑
          </h2>
        </div>

        {/* Picker Secret Controls */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-player-profile"
            onClick={() => {
              if (isAnyModalOpen) return;
              sounds.playClick();
              setShowProfileModal(true);
            }}
            title="ملف اللاعب الشامل (سري لصاحب الجولة)"
            className="p-2.5 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] border border-[#212823] flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-[#22C55E]" />
            <span className="hidden sm:inline">ملف اللاعب</span>
          </button>

          <button
            id="btn-open-ai-assistant"
            onClick={() => {
              if (isAnyModalOpen) return;
              sounds.playClick();
              setShowAiModal(true);
            }}
            title="اسأل الـ AI (سري لصاحب الجولة)"
            className="p-2.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/40 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">اسأل الـ AI</span>
          </button>
        </div>
      </div>

      {/* Gameplay Conversation Prompt Banner */}
      <div className="bg-[#131815] p-3.5 sm:p-4 rounded-2xl border border-[#212823] text-right flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center text-xl shrink-0">
          🗣️
        </div>
        <div className="text-xs space-y-0.5">
          <p className="font-black text-[#EEF2EF]">
            صاحب الجولة معاه ملف اللاعب الكامل وبيجاوب على أسئلتكم.
          </p>
          <p className="text-[#8FA095]">
            اسألوه أسئلة ذكية وخمنوا مين اللاعب قبل ما محاولاتكم تخلص!
          </p>
        </div>
      </div>

      {/* Round Hints Panel (free, one per guesser) */}
      <div id="hints-panel" className="bg-[#131815] p-3.5 sm:p-4 rounded-2xl border border-amber-800/30 text-right space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-black text-[#EEF2EF] flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <span>تلميحات الجولة</span>
          </h3>
          <span className="text-[10px] font-bold text-[#8FA095] bg-[#171E1A] border border-[#212823] px-2 py-0.5 rounded-full">
            تلميح مجاني لكل مخمّن
          </span>
        </div>

        {revealedHints.length === 0 ? (
          <p className="text-[11px] text-[#8FA095] leading-relaxed">
            لو حد تايه، اضغط «تلميح» جوه كارت اللاعب وهنكشف معلومة واحدة عن اللاعب السري من غير ما تنقص أسئلة ولا تخمينات.
          </p>
        ) : (
          <div className="space-y-2">
            {revealedHints.map((hint, index) => (
              <div
                key={`${hint.key}-${index}`}
                id={`revealed-hint-${index}`}
                className="flex items-center justify-between gap-3 bg-amber-950/25 border border-amber-800/40 rounded-xl px-3 py-2"
              >
                <span className="text-[11px] font-bold text-amber-300/90">{hint.label}</span>
                <span className="text-xs font-black text-[#EEF2EF]">{hint.value}</span>
              </div>
            ))}
          </div>
        )}

        {revealedHints.length >= hintDeck.length && hintDeck.length > 0 && (
          <p className="text-[10px] text-[#5C6B61]">كل التلميحات المتاحة للجولة دي ظهرت.</p>
        )}
      </div>

      {/* Guesser Status Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-[#EEF2EF] flex items-center gap-2">
            <span>👥</span> استهلاك الأسئلة والتخمينات:
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guessers.map((player) => {
            const qLeft = remainingQuestions[player.id] ?? 0;
            const gLeft = remainingGuesses[player.id] ?? 0;
            const hasUsedExtra = extraGuessUsed[player.id] ?? false;
            const canAffordExtra = player.score >= EXTRA_GUESS_COST;
            const hasNoGuesses = gLeft <= 0;
            const buttonsDisabled = timeUp || isAnyModalOpen;

            return (
              <div
                key={player.id}
                className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  hasNoGuesses
                    ? 'bg-[#101412] border-[#1A211D] opacity-80'
                    : 'bg-[#131815] border-[#212823] shadow-md'
                }`}
              >
                <div>
                  {/* Player Header with Score */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div>
                      <div className="font-black text-base text-[#EEF2EF]">
                        {player.name}
                      </div>
                      <div className="text-[11px] text-[#8FA095]">
                        النقاط الحالية:{' '}
                        <span className="font-bold text-[#22C55E]">
                          {player.score}
                        </span>
                      </div>
                    </div>

                    {hasNoGuesses && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-800/40">
                        خلص تخميناته
                      </span>
                    )}
                  </div>

                  {/* Counters Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {/* Questions Card */}
                    <div className="bg-[#171E1A] p-2.5 rounded-xl border border-[#212823] text-center flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-[#5C6B61] block mb-0.5">
                          الأسئلة الباقية
                        </span>
                        <span className="text-xl font-black text-[#EEF2EF]">
                          {qLeft}
                        </span>
                      </div>
                      <button
                        id={`btn-deduct-q-${player.id}`}
                        onClick={() => handleDeductQuestionClick(player.id)}
                        disabled={buttonsDisabled || qLeft <= 0}
                        className={`mt-2 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !buttonsDisabled && qLeft > 0
                            ? 'bg-[#131815] hover:bg-[#1C2520] text-[#EEF2EF] border border-[#212823] active:scale-95'
                            : 'bg-[#131815]/50 text-[#5C6B61] cursor-not-allowed'
                        }`}
                      >
                        سأل سؤال (-1)
                      </button>
                    </div>

                    {/* Guesses Card */}
                    <div className="bg-[#171E1A] p-2.5 rounded-xl border border-[#212823] text-center flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-[#5C6B61] block mb-0.5">
                          التخمينات الباقية
                        </span>
                        <span
                          className={`text-xl font-black ${
                            gLeft > 0 ? 'text-[#22C55E]' : 'text-rose-400'
                          }`}
                        >
                          {gLeft}
                        </span>
                      </div>
                      <button
                        id={`btn-deduct-g-${player.id}`}
                        onClick={() => handleDeductGuessClick(player)}
                        disabled={buttonsDisabled || gLeft <= 0}
                        className={`mt-2 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !buttonsDisabled && gLeft > 0
                            ? 'bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 active:scale-95'
                            : 'bg-[#131815]/50 text-[#5C6B61] cursor-not-allowed'
                        }`}
                      >
                        خمّن غلط (-1)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Extra Guess & Win Action */}
                <div className="space-y-2 pt-2 border-t border-[#212823]">
                  {/* Free Hint */}
                  {(() => {
                    const hintUsed = hintsUsed[player.id] ?? 0;
                    const deckFinished = hintDeck.length === 0 || revealedHints.length >= hintDeck.length;
                    const hintsLeft = Math.max(0, HINTS_PER_PLAYER - hintUsed);
                    const hintDisabled = buttonsDisabled || hintsLeft <= 0 || deckFinished;
                    const hintLabel = deckFinished
                      ? 'مفيش تلميحات متاحة'
                      : hintsLeft <= 0
                      ? 'استخدمت التلميح'
                      : `تلميح مجاني (${hintsLeft})`;

                    return (
                      <button
                        id={`btn-hint-${player.id}`}
                        onClick={() => handleUseHintClick(player)}
                        disabled={hintDisabled}
                        className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          !hintDisabled
                            ? 'bg-amber-950/25 hover:bg-amber-900/35 text-amber-300 border border-amber-800/40 active:scale-95'
                            : 'bg-[#171E1A]/40 text-[#5C6B61] border border-[#212823]/40 cursor-not-allowed'
                        }`}
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{hintLabel}</span>
                      </button>
                    );
                  })()}

                  {/* Extra Guess Option */}
                  {!hasUsedExtra ? (
                    <button
                      id={`btn-buy-extra-${player.id}`}
                      onClick={() => handleBuyExtraGuessClick(player)}
                      disabled={buttonsDisabled || !canAffordExtra}
                      className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        !buttonsDisabled && canAffordExtra
                          ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-800/40 active:scale-95'
                          : 'bg-[#171E1A]/40 text-[#5C6B61] border border-[#212823]/40 cursor-not-allowed'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>تخمينة إضافية ({EXTRA_GUESS_COST} نقاط)</span>
                    </button>
                  ) : (
                    <div className="text-[10px] text-center text-[#5C6B61] py-1">
                      استخدم التخمينة الإضافية
                    </div>
                  )}

                  {/* Winner Button */}
                  <button
                    id={`btn-winner-${player.id}`}
                    onClick={() => handleWinnerClick(player)}
                    disabled={buttonsDisabled || gLeft <= 0}
                    className={`w-full py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all ${
                      !buttonsDisabled && gLeft > 0
                        ? 'bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] theme-accent-bg theme-accent-glow shadow-[#22C55E]/20 cursor-pointer active:scale-95'
                        : 'bg-[#22C55E]/40 text-[#0B0D0C]/60 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>صح! خمّن اللاعب 🎯</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Undo Button (Wide Secondary Button above End Round row) */}
      <div className="pt-2">
        <button
          type="button"
          id="btn-undo-action"
          onClick={onUndo}
          disabled={undoCount === 0 || timeUp || isAnyModalOpen}
          className={`w-full py-2.5 px-4 rounded-2xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
            undoCount > 0 && !timeUp && !isAnyModalOpen
              ? 'bg-[#171E1A] hover:bg-[#1C2520] active:bg-[#131815] text-[#EEF2EF] border-[#212823] hover:border-[#22C55E]/50 cursor-pointer active:scale-[0.99]'
              : 'bg-[#131815]/60 text-[#5C6B61] border-[#212823]/50 cursor-not-allowed'
          }`}
        >
          <RotateCcw className="w-4 h-4 text-[#22C55E]" />
          <span>↩️ تراجع عن آخر ضغطة</span>
          <span className="text-[11px] font-bold text-[#8FA095]">({undoCount})</span>
        </button>
      </div>

      {/* Bottom End Round Controls */}
      <div className="pt-2 border-t border-[#212823] flex items-center justify-between gap-3">
        <button
          id="btn-end-nobody-won"
          onClick={() => {
            if (timeUp || isAnyModalOpen) return;
            setShowConfirmEndManual(true);
          }}
          disabled={timeUp || isAnyModalOpen}
          className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold border transition-colors ${
            !timeUp && !isAnyModalOpen
              ? 'bg-[#171E1A] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] border-[#212823] cursor-pointer'
              : 'bg-[#131815]/50 text-[#5C6B61] border-[#212823]/50 cursor-not-allowed'
          }`}
        >
          إنهاء الجولة (محدش عرف)
        </button>
      </div>

      {/* Confirm Winner Modal */}
      {confirmWinnerPlayer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131815] p-6 rounded-3xl border border-[#212823] max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] flex items-center justify-center text-2xl mx-auto mb-3">
              🎯
            </div>
            <h3 className="text-lg font-black text-[#EEF2EF] mb-1.5">
              {confirmWinnerPlayer.name} خمّن اللاعب صح؟
            </h3>
            <p className="text-xs text-[#8FA095] mb-5">
              هياخد {calcCorrectGuessPoints(questionsUsed[confirmWinnerPlayer.id] ?? 0)} نقطة
            </p>
            <div className="flex gap-2">
              <button
                id="btn-confirm-winner-yes"
                onClick={handleConfirmWinner}
                className="flex-1 py-3 rounded-xl bg-[#22C55E] hover:bg-[#1FA644] text-[#0B0D0C] font-black text-xs transition-colors cursor-pointer"
              >
                أيوه، تأكيد
              </button>
              <button
                onClick={() => setConfirmWinnerPlayer(null)}
                className="flex-1 py-3 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Last Guess Exhaustion Modal */}
      {confirmLastGuessPlayerId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131815] p-6 rounded-3xl border border-[#212823] max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-[#EEF2EF] mb-1.5">
              ده آخر تخمين متبقي في الجولة
            </h3>
            <p className="text-xs text-[#8FA095] mb-5 leading-relaxed">
              ده آخر تخمين متبقي في الجولة. لو كملت الجولة هتخلص وصاحب الجولة هياخد {NOBODY_WON_PICKER_POINTS} نقاط. تكمل؟
            </p>
            <div className="flex gap-2">
              <button
                id="btn-confirm-last-guess-yes"
                onClick={handleConfirmLastGuess}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs transition-colors cursor-pointer"
              >
                كمّل
              </button>
              <button
                onClick={() => setConfirmLastGuessPlayerId(null)}
                className="flex-1 py-3 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Manual End Modal */}
      {showConfirmEndManual && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131815] p-6 rounded-3xl border border-[#212823] max-w-sm w-full text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">
              ❓
            </div>
            <h3 className="text-lg font-black text-[#EEF2EF] mb-1.5">
              إنهاء الجولة بدون فائز؟
            </h3>
            <p className="text-xs text-[#8FA095] mb-5">
              صاحب الجولة هياخد {NOBODY_WON_PICKER_POINTS} نقاط كاملة ومحدش من المخمنين هياخد نقاط.
            </p>
            <div className="flex gap-2">
              <button
                id="btn-confirm-end-yes"
                onClick={() => {
                  setShowConfirmEndManual(false);
                  onEndRoundNobodyWon('manual_end');
                }}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs transition-colors cursor-pointer"
              >
                أيوه، أنهي الجولة
              </button>
              <button
                onClick={() => setShowConfirmEndManual(false)}
                className="flex-1 py-3 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile & Assistant Modals */}
      <PlayerProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        profile={profile}
        pickerName={picker.name}
      />

      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        profile={profile}
        pickerName={picker.name}
      />
    </div>
  );
};
