import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { GameSettings } from '../types';
import { sounds } from '../utils/sound';

interface SetupRulesProps {
  onBack: () => void;
  onStartGame: (settings: GameSettings) => void;
  playersCount: number;
}

const TIMER_OPTIONS = [
  { value: 0, label: 'من غير وقت' },
  { value: 60, label: 'دقيقة' },
  { value: 120, label: 'دقيقتين' },
  { value: 300, label: '5 دقايق' },
  { value: 600, label: '10 دقايق' },
];

export const SetupRules: React.FC<SetupRulesProps> = ({
  onBack,
  onStartGame,
  playersCount,
}) => {
  const [questions, setQuestions] = useState<number>(2);
  const [guesses, setGuesses] = useState<number>(2);
  const [timerDuration, setTimerDuration] = useState<number>(0);

  const handleStart = () => {
    sounds.playSuccess();
    onStartGame({
      questionsPerPlayer: questions,
      guessesPerPlayer: guesses,
      timerDuration,
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-6 px-4 select-none">
      {/* Back button */}
      <button
        onClick={() => {
          sounds.playClick();
          onBack();
        }}
        className="mb-3 text-xs font-semibold text-[#8FA095] hover:text-[#EEF2EF] flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <ArrowRight className="w-4 h-4" />
        <span>تعديل أسماء اللاعبين</span>
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-2xl mb-2.5">
          ⚙️
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1.5 tracking-tight">
          ظبطوا اللعبة
        </h2>
        <p className="text-xs sm:text-sm text-[#8FA095]">
          حددوا موارد الأسئلة والتخمينات ووقت الجولة
        </p>
      </div>

      <div className="space-y-4">
        {/* Questions per player */}
        <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-sm font-black text-[#EEF2EF] flex items-center gap-2">
              <span className="text-lg">❓</span> كل واحد له كام سؤال؟
            </label>
            <span className="text-xs font-bold text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-md">
              {questions} {questions === 1 ? 'سؤال' : questions === 2 ? 'سؤالين' : 'أسئلة'}
            </span>
          </div>
          <p className="text-xs text-[#8FA095] mb-3">
            الأسئلة اللي يقدر يسألها لصاحب الجولة في الحقيقة (نعم / لا أو معلومات).
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((num) => {
              const isSelected = questions === num;
              return (
                <button
                  key={num}
                  type="button"
                  id={`btn-questions-${num}`}
                  onClick={() => {
                    sounds.playSelect();
                    setQuestions(num);
                  }}
                  className={`py-3 rounded-xl font-black text-base transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#22C55E] text-[#0B0D0C] shadow-md shadow-[#22C55E]/20 scale-105'
                      : 'bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] hover:bg-[#1C2520] border border-[#212823]'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guesses per player */}
        <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-sm font-black text-[#EEF2EF] flex items-center gap-2">
              <span className="text-lg">🎯</span> كل واحد له كام تخمينة؟
            </label>
            <span className="text-xs font-bold text-sky-400 bg-sky-400/10 px-2 py-0.5 rounded-md">
              {guesses} {guesses === 1 ? 'تخمينة' : guesses === 2 ? 'تخمينتين' : 'تخمينات'}
            </span>
          </div>
          <p className="text-xs text-[#8FA095] mb-3">
            عدد المحاولات الرسمية لتسمية اللاعب. التخمين الصح ينهي الجولة فوراً!
          </p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((num) => {
              const isSelected = guesses === num;
              return (
                <button
                  key={num}
                  type="button"
                  id={`btn-guesses-${num}`}
                  onClick={() => {
                    sounds.playSelect();
                    setGuesses(num);
                  }}
                  className={`py-3 rounded-xl font-black text-base transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-sky-500 text-[#0B0D0C] shadow-md shadow-sky-500/20 scale-105'
                      : 'bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] hover:bg-[#1C2520] border border-[#212823]'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Round Timer */}
        <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] shadow-md">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-sm font-black text-[#EEF2EF] flex items-center gap-2">
              <span className="text-lg">⏱️</span> وقت الجولة (اختياري)
            </label>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
              timerDuration === 0
                ? 'text-[#8FA095] bg-[#171E1A]'
                : 'text-amber-400 bg-amber-400/10'
            }`}>
              {TIMER_OPTIONS.find((t) => t.value === timerDuration)?.label || 'من غير وقت'}
            </span>
          </div>
          <p className="text-xs text-[#8FA095] mb-3">
            العداد هيبدأ بس لما تبدأوا التخمين الفعلي. لو الوقت خلص ومحدش عرفه، صاحب الجولة بياخد النقاط.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIMER_OPTIONS.map((opt) => {
              const isSelected = timerDuration === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  id={`btn-timer-${opt.value}`}
                  onClick={() => {
                    sounds.playSelect();
                    setTimerDuration(opt.value);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-[#0B0D0C] shadow-md shadow-amber-500/20 scale-[1.02]'
                      : 'bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] hover:bg-[#1C2520] border border-[#212823]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Fixed rule notice */}
        <div className="p-3.5 rounded-2xl bg-[#171E1A] border border-[#212823] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#22C55E] shrink-0 mt-0.5" />
          <p className="text-xs text-[#8FA095] leading-relaxed">
            القيم دي ثابتة طوال اللعبة لكل اللاعبين. في كل جولة، صاحب الجولة بيختار اللاعب والباقيين يتنافسوا بنفس الموارد.
          </p>
        </div>

        {/* Start Game Button */}
        <button
          id="btn-start-game-loop"
          onClick={handleStart}
          className="w-full py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98]"
        >
          <span>يلا نبدأ الجولة الأولى</span>
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
