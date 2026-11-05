import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { sounds } from '../utils/sound';

interface RoundIntroProps {
  roundNumber: number;
  pickerName: string;
  onProceedToPrivacy: () => void;
}

export const RoundIntro: React.FC<RoundIntroProps> = ({
  roundNumber,
  pickerName,
  onProceedToPrivacy,
}) => {
  const handleClick = () => {
    sounds.playClick();
    onProceedToPrivacy();
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 sm:py-10 px-4 text-center select-none">
      {/* Round Badge */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-black tracking-wider uppercase mb-5">
        <Sparkles className="w-3.5 h-3.5" />
        <span>الجولة {roundNumber}</span>
      </div>

      {/* Main Announcement Card */}
      <div className="bg-[#131815] p-6 sm:p-8 rounded-3xl border border-[#212823] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-[#22C55E]" />

        <div className="w-20 h-20 rounded-2xl bg-[#171E1A] border-2 border-[#22C55E]/40 flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
          👑
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-2 tracking-tight">
          دورك يا <span className="text-[#22C55E]">{pickerName}</span>
        </h2>

        <p className="text-xs sm:text-sm text-[#8FA095] leading-relaxed max-w-sm mx-auto">
          اختار لاعب في سرك، وخلي الباقيين مايشوفوش.
        </p>
      </div>

      {/* Action Button */}
      <button
        type="button"
        id="btn-choose-player-start"
        onClick={handleClick}
        className="w-full min-h-[52px] py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] theme-accent-bg theme-accent-glow font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
      >
        <span>اختيار اللاعب</span>
        <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};
