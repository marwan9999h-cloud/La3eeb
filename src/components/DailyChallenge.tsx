import React, { useEffect, useMemo, useState } from 'react';
import { X, Flame, Share2, Check, Loader2, RotateCcw } from 'lucide-react';
import { sounds } from '../utils/sound';
import { DAILY_QUESTIONS } from '../data/dailyQuestions';
import {
  buildDailyChallenge,
  dailyKey,
  loadDailyProgress,
  saveDailyResult,
  streakLabel,
  DailyChallengeQuestion,
  DailyProgress,
} from '../utils/daily';
import {
  buildDailyShareModel,
  renderDailyShareCard,
  shareOrDownloadCard,
} from '../utils/shareCard';

interface DailyChallengeProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'intro' | 'question' | 'result';
type ShareState = 'idle' | 'working' | 'shared' | 'downloaded' | 'error';

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ isOpen, onClose }) => {
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [progress, setProgress] = useState<DailyProgress>({
    streak: 0,
    lastPlayed: null,
    bestScoreToday: null,
  });
  const [shareState, setShareState] = useState<ShareState>('idle');

  const todayKey = useMemo(() => dailyKey(), [isOpen]);
  const challenge: DailyChallengeQuestion[] = useMemo(
    () => buildDailyChallenge(DAILY_QUESTIONS, todayKey),
    [todayKey]
  );

  useEffect(() => {
    if (isOpen) {
      setPhase('intro');
      setIndex(0);
      setSelected(null);
      setScore(0);
      setShareState('idle');
      setProgress(loadDailyProgress(todayKey));
    }
  }, [isOpen, todayKey]);

  if (!isOpen) return null;

  const question = challenge[index];
  const total = challenge.length;
  const isLast = index === total - 1;

  const handleStart = () => {
    sounds.playSelect();
    setPhase('question');
  };

  const handlePick = (optionIdx: number) => {
    if (selected !== null || !question) return;
    setSelected(optionIdx);
    const correct = question.options[optionIdx]?.isCorrect === true;
    if (correct) {
      sounds.playSuccess();
      setScore((s) => s + 1);
    } else {
      sounds.playNobodyWon();
    }
    const finalScore = correct ? score + 1 : score;
    setTimeout(() => {
      if (isLast) {
        const saved = saveDailyResult(finalScore, todayKey);
        setProgress(saved);
        setPhase('result');
        if (finalScore === total) sounds.playVictory();
      } else {
        setIndex((i) => i + 1);
        setSelected(null);
      }
    }, 1100);
  };

  const handleShare = async () => {
    if (shareState === 'working') return;
    sounds.playSelect();
    setShareState('working');
    try {
      const shownScore = progress.bestScoreToday ?? score;
      const model = buildDailyShareModel(shownScore, total, progress.streak);
      const blob = await renderDailyShareCard(model);
      const outcome = await shareOrDownloadCard(blob, 'la3eeb-daily.png');
      if (outcome === 'cancelled') {
        setShareState('idle');
        return;
      }
      setShareState(outcome === 'shared' ? 'shared' : 'downloaded');
      setTimeout(() => setShareState('idle'), 3000);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 3000);
    }
  };

  const resultEmoji =
    total > 0 && score === total ? '🏆' : score >= total / 2 ? '💪' : '😅';

  const shareLabel =
    shareState === 'working'
      ? 'بنجهز الكارت...'
      : shareState === 'shared'
        ? 'اتشاركت ✅'
        : shareState === 'downloaded'
          ? 'الصورة اتحملت ✅'
          : shareState === 'error'
            ? 'حصلت مشكلة، جرب تاني'
            : 'شارك نتيجة التحدي';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#131815] border border-[#212823] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#212823] flex items-center justify-between bg-[#171E1A]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <h2 className="font-black text-base sm:text-lg text-[#EEF2EF]">تحدي اليوم</h2>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto text-center">
          {phase === 'intro' && (
            <div className="space-y-5 py-2">
              <div className="text-5xl">⚽</div>
              <div>
                <h3 className="text-xl font-black text-[#EEF2EF] mb-1.5">
                  5 أسئلة كورة جديدة كل يوم
                </h3>
                <p className="text-xs sm:text-sm text-[#8FA095] leading-relaxed">
                  نفس الأسئلة ليك ولصحابك النهارده. جاوب وقارنوا نتايجكم!
                </p>
              </div>

              {progress.streak > 0 && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-sm font-black">
                  <Flame className="w-4 h-4" />
                  <span>سلسلتك: {streakLabel(progress.streak)}</span>
                </div>
              )}

              {progress.bestScoreToday !== null && (
                <p className="text-xs text-[#8FA095]">
                  لعبت النهارده وأعلى نتيجة ليك: {progress.bestScoreToday}/{total}. ممكن تعيد للتدريب!
                </p>
              )}

              <button
                id="btn-start-daily"
                onClick={handleStart}
                className="w-full py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>{progress.bestScoreToday !== null ? 'العب تاني' : 'ابدأ التحدي'}</span>
              </button>
            </div>
          )}

          {phase === 'question' && question && (
            <div className="space-y-4 text-right">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#8FA095]">
                  سؤال {index + 1} من {total}
                </span>
                <div className="flex gap-1">
                  {challenge.map((_, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < index ? 'bg-[#22C55E]' : i === index ? 'bg-[#EEF2EF]' : 'bg-[#212823]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-[#EEF2EF] leading-relaxed">
                {question.question}
              </h3>

              <div className="space-y-2.5 pt-1">
                {question.options.map((opt, i) => {
                  const answered = selected !== null;
                  const isPicked = selected === i;
                  let cls =
                    'bg-[#171E1A] border-[#212823] text-[#EEF2EF] hover:border-[#22C55E]/50';
                  if (answered && opt.isCorrect) {
                    cls = 'bg-[#15231A] border-[#22C55E] text-[#22C55E]';
                  } else if (answered && isPicked && !opt.isCorrect) {
                    cls = 'bg-[#2A1515] border-red-500/60 text-red-400';
                  } else if (answered) {
                    cls = 'bg-[#171E1A] border-[#212823] text-[#5C6B61]';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handlePick(i)}
                      disabled={answered}
                      className={`w-full p-3.5 rounded-2xl border-2 font-bold text-sm sm:text-base text-right transition-all cursor-pointer disabled:cursor-default ${cls}`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="space-y-5 py-2">
              <div className="text-5xl">{resultEmoji}</div>
              <div>
                <div className="text-4xl font-black text-[#22C55E] mb-1">
                  {score} / {total}
                </div>
                <p className="text-xs sm:text-sm text-[#8FA095]">
                  {score === total
                    ? 'علامة كاملة! دماغك كورة فعلاً 🔥'
                    : score >= total / 2
                      ? 'نتيجة كويسة! تعالى بكرة تكمل السلسلة'
                      : 'مشكلة لحظة.. بكرة أسئلة جديدة وفرصة جديدة'}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-sm font-black">
                <Flame className="w-4 h-4" />
                <span>{streakLabel(progress.streak)}</span>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  id="btn-share-daily"
                  onClick={handleShare}
                  disabled={shareState === 'working'}
                  className="w-full py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70"
                >
                  {shareState === 'working' ? (
                    <Loader2 className="w-5 h-5 stroke-[2.5] animate-spin" />
                  ) : shareState === 'shared' || shareState === 'downloaded' ? (
                    <Check className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <Share2 className="w-5 h-5 stroke-[2.5]" />
                  )}
                  <span>{shareLabel}</span>
                </button>

                <button
                  onClick={() => {
                    sounds.playClick();
                    setPhase('intro');
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-[#171E1A] hover:bg-[#1C2420] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ارجع لبداية التحدي</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
