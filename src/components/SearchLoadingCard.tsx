import React, { useState, useEffect } from 'react';
import { Lock, Zap } from 'lucide-react';

interface SearchLoadingCardProps {
  query?: string;
  onInstantSecretPlay?: () => void;
}

const SEARCH_STEPS = [
  'فحص قاعدة البيانات الكروية المحلية ⚡',
  'مطابقة الأسماء والألقاب والمسيرة 🔎',
  'استرجاع تاريخ البطولات والأندية 🏆',
  'تجهيز ملف اللاعب والخيارات ⚽',
];

export const SearchLoadingCard: React.FC<SearchLoadingCardProps> = ({
  query,
  onInstantSecretPlay,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % SEARCH_STEPS.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      dir="rtl"
      className="w-full flex items-center justify-center py-6 px-4 animate-in fade-in duration-300"
    >
      {/* Surface Card Container */}
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#131815]/95 backdrop-blur-md border border-[#22C55E]/25 shadow-2xl shadow-black/80 text-center select-none overflow-hidden">
        {/* Top Glowing Ambient Gradient Line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[2px] bg-gradient-to-r from-transparent via-[#22C55E] to-transparent shadow-[0_0_12px_#22C55E]" />

        {/* Ambient Subtle Background Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#22C55E]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Tactical Radar Spinner */}
        <div className="relative flex items-center justify-center my-4">
          {/* Outer Pulsing Ping Wave */}
          <div className="absolute w-28 h-28 rounded-full border border-[#22C55E]/20 bg-[#22C55E]/5 animate-ping opacity-40 pointer-events-none" />

          {/* Concentric Rotating Tech Ring */}
          <div
            className="w-24 h-24 rounded-full border-2 border-dashed border-[#22C55E]/40 animate-spin pointer-events-none flex items-center justify-center"
            style={{ animationDuration: '6s' }}
          >
            {/* Orbiting Satellite Dot */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]" />
          </div>

          {/* Center Football Core */}
          <div className="absolute w-16 h-16 rounded-2xl bg-[#171E1A] border-2 border-[#22C55E]/50 flex items-center justify-center shadow-lg shadow-[#22C55E]/20 text-3xl">
            <span className="inline-block animate-pulse">⚽</span>
          </div>
        </div>

        {/* Main Title */}
        <h3 className="text-lg sm:text-xl font-black text-[#EEF2EF] mb-1.5 tracking-tight">
          بندور على اللاعب في الأرشيف...
        </h3>

        {query && (
          <div className="inline-block px-3 py-1 rounded-lg bg-[#171E1A] border border-[#212823] text-xs font-bold text-amber-300 mb-3">
            « {query} »
          </div>
        )}

        {/* Dynamic Step Display */}
        <div className="min-h-[32px] flex items-center justify-center mb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171E1A] border border-[#22C55E]/30 text-xs font-semibold text-[#22C55E] transition-all">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
            <span>{SEARCH_STEPS[stepIndex]}</span>
          </div>
        </div>

        {/* Round State Protected Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8FA095] bg-[#0E1210] py-2 px-3 rounded-xl border border-[#1C2520] mb-4">
          <Lock className="w-3 h-3 text-[#22C55E]" />
          <span>حالة الجولة الحالية وبيانات اللاعبين محفوظة بالكامل 🔒</span>
        </div>

        {/* Optional Instant Play Bypass */}
        {onInstantSecretPlay && (
          <button
            type="button"
            id="btn-loader-instant-secret"
            onClick={onInstantSecretPlay}
            className="w-full py-2.5 px-4 rounded-xl bg-[#171E1A] hover:bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:text-[#22C55E] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>مستعجل؟ العب به في سرك فوراً بدون انتظار ⚡</span>
          </button>
        )}
      </div>
    </div>
  );
};
