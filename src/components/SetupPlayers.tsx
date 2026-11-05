import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { sounds } from '../utils/sound';

interface SetupPlayersProps {
  onContinue: (playerNames: string[]) => void;
  onBack?: () => void;
}

const DEFAULT_NAMES = ['مارو', 'أحمد', 'يوسف', 'سيف', 'عمر', 'كريم', 'طارق', 'علي'];

export const SetupPlayers: React.FC<SetupPlayersProps> = ({ onContinue, onBack }) => {
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [names, setNames] = useState<string[]>(['مارو', 'أحمد', 'يوسف', 'سيف']);
  const [error, setError] = useState<string | null>(null);

  const handleCountChange = (count: number) => {
    sounds.playSelect();
    setPlayerCount(count);
    setError(null);
    setNames((prev) => {
      const next = [...prev];
      if (count > next.length) {
        for (let i = next.length; i < count; i++) {
          next.push(DEFAULT_NAMES[i] || `لاعب ${i + 1}`);
        }
      } else {
        return next.slice(0, count);
      }
      return next;
    });
  };

  const handleNameChange = (index: number, val: string) => {
    setError(null);
    setNames((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check for empty names
    const trimmed = names.map((n) => n.trim());
    for (let i = 0; i < trimmed.length; i++) {
      if (!trimmed[i]) {
        setError(`اسم اللاعب رقم ${i + 1} فاضي، اكتب اسمه عشان نبدأ.`);
        sounds.playDeduct();
        return;
      }
    }

    // Check for duplicates
    const unique = new Set(trimmed.map((n) => n.toLowerCase()));
    if (unique.size < trimmed.length) {
      setError('في أسماء مكررة، خلي كل لاعب باسم مختلف.');
      sounds.playDeduct();
      return;
    }

    sounds.playSuccess();
    onContinue(trimmed);
  };

  const getOrdinalLabel = (i: number) => {
    const ordinals = [
      'الأول',
      'التاني',
      'التالت',
      'الرابع',
      'الخامس',
      'السادس',
      'السابع',
      'التامن',
    ];
    return `اللاعب ${ordinals[i] || i + 1}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-6 px-4 select-none">
      {/* Intro Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/30 text-3xl mb-3 shadow-lg shadow-[#22C55E]/5">
          ⚽
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1.5 tracking-tight">
          مين هيلعب؟
        </h2>
        <p className="text-xs sm:text-sm text-[#8FA095]">
          اختاروا عدد الصحاب اللي هيلعبوا واكتبوا أسماءكم
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Player Count Selection */}
        <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] shadow-md">
          <label className="block text-xs font-black text-[#8FA095] uppercase tracking-wider mb-2.5">
            كام واحد في القعدة؟
          </label>
          <div className="grid grid-cols-6 gap-2">
            {[3, 4, 5, 6, 7, 8].map((count) => {
              const isSelected = playerCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  id={`btn-count-${count}`}
                  onClick={() => handleCountChange(count)}
                  className={`py-3 rounded-xl font-black text-base transition-all cursor-pointer ${
                    isSelected
                      ? 'theme-accent-bg theme-accent-glow scale-105'
                      : 'bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] hover:bg-[#1C2520] border border-[#212823]'
                  }`}
                >
                  {count}
                </button>
              );
            })}
          </div>
        </div>

        {/* Names Inputs */}
        <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] space-y-3 shadow-md">
          <label className="block text-xs font-black text-[#8FA095] uppercase tracking-wider mb-0.5">
            أسماء اللاعبين
          </label>

          <div className="space-y-2.5">
            {names.map((name, idx) => (
              <div key={idx} className="relative">
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#5C6B61]">
                  {getOrdinalLabel(idx)}
                </span>
                <input
                  id={`input-player-name-${idx}`}
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder={`اكتب اسم ${getOrdinalLabel(idx)}`}
                  className="w-full pr-24 pl-4 py-3 bg-[#171E1A] border border-[#212823] focus:border-[#22C55E] rounded-xl text-sm font-semibold text-[#EEF2EF] placeholder-[#5C6B61] focus:outline-none transition-colors text-right"
                  maxLength={20}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit & Back actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="submit"
            id="btn-submit-players"
            className="flex-1 py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] theme-accent-bg theme-accent-glow font-black text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>يلا نظبط اللعبة</span>
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {onBack && (
            <button
              type="button"
              id="btn-back-to-home"
              onClick={() => {
                sounds.playClick();
                onBack();
              }}
              className="py-4 px-6 rounded-2xl bg-[#171E1A] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] font-bold text-sm border border-[#212823] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>رجوع للرئيسية</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
