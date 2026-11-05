import React from 'react';
import { EyeOff, ArrowLeft } from 'lucide-react';
import { sounds } from '../utils/sound';

interface PassDevicePrivacyProps {
  pickerName: string;
  onConfirmPrivacy: () => void;
}

export const PassDevicePrivacy: React.FC<PassDevicePrivacyProps> = ({
  pickerName,
  onConfirmPrivacy,
}) => {
  const handleStart = () => {
    sounds.playSelect();
    onConfirmPrivacy();
  };

  return (
    <div className="w-full max-w-lg mx-auto py-8 sm:py-10 px-4 text-center select-none">
      <div className="bg-[#131815] p-6 sm:p-8 rounded-3xl border border-[#212823] shadow-2xl mb-6 relative">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-4xl mx-auto mb-4 text-amber-400">
          🤫
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-2 tracking-tight">
          الشاشة دي ليك إنت بس يا {pickerName} 🤫
        </h2>

        <p className="text-xs sm:text-sm text-[#8FA095] leading-relaxed max-w-xs mx-auto mb-5">
          ماتخليش حد يشوف اللاعب اللي هتختاره أو المعلومات اللي هتختارها.
        </p>

        <div className="p-3.5 rounded-xl bg-[#171E1A] border border-[#212823] flex items-center justify-center gap-2 text-xs font-bold text-amber-300">
          <EyeOff className="w-4 h-4 shrink-0" />
          <span>تأكد إن الجهاز في إيدك وباقي الصحاب مش باصين!</span>
        </div>
      </div>

      <button
        type="button"
        id="btn-privacy-ready"
        onClick={handleStart}
        className="w-full min-h-[52px] py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] theme-accent-bg theme-accent-glow font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-[0.98]"
      >
        <span>تمام، نبدأ</span>
        <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};
