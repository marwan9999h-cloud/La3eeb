import React from 'react';
import { Play, HelpCircle, Settings, ArrowLeft } from 'lucide-react';
import { sounds } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeScreenProps {
  onStartGame: () => void;
  onOpenRules: () => void;
  onOpenSettings: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartGame,
  onOpenRules,
  onOpenSettings,
}) => {
  return (
    <div className="relative w-full max-w-xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-between min-h-[calc(100vh-4.5rem)] select-none overflow-hidden text-center">
      {/* Background Subtle Atmosphere & Football Field Texture */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft Radial Ambient Lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-[#22C55E]/[0.04] rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-radial from-transparent via-[#0B0D0C]/40 to-[#0B0D0C]" />

        {/* Minimal Sophisticated Football Field Lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 400 600"
          fill="none"
          stroke="#22C55E"
          strokeWidth="1.2"
        >
          <rect x="24" y="24" width="352" height="552" rx="14" />
          <line x1="24" y1="300" x2="376" y2="300" />
          <circle cx="200" cy="300" r="50" />
          <circle cx="200" cy="300" r="2.5" fill="#22C55E" />
          {/* Top Penalty Area */}
          <rect x="115" y="24" width="170" height="85" />
          <path d="M 160 109 A 40 40 0 0 0 240 109" />
          {/* Bottom Penalty Area */}
          <rect x="115" y="491" width="170" height="85" />
          <path d="M 160 491 A 40 40 0 0 1 240 491" />
        </svg>
      </div>

      {/* Top Balancing Spacer */}
      <div className="w-full h-2 sm:h-6" />

      {/* Central Hero Composition */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center my-auto space-y-8 sm:space-y-10 transition-transform duration-300">
        {/* Main Title - Pure, Confident, Dominant */}
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight flex items-center justify-center gap-3">
            <span className="text-[#22C55E] theme-accent-text">خَمّن</span>
            <span className="text-[#EEF2EF]">اللاعب</span>
            <span className="text-4xl sm:text-5xl md:text-6xl">⚽</span>
          </h1>
        </div>

        {/* Primary CTA - Start Game */}
        <div className="w-full max-w-xs sm:max-w-sm px-2">
          <button
            id="btn-start-game-home"
            onClick={() => {
              sounds.playSelect();
              onStartGame();
            }}
            className="group relative w-full py-4 sm:py-4.5 px-8 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] theme-accent-bg theme-accent-glow font-black text-lg sm:text-xl flex items-center justify-center gap-3 shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>ابدأ اللعبة</span>
            <ArrowLeft className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:-translate-x-1" />
          </button>
        </div>
      </div>

      {/* Bottom Secondary Controls & Creator Signature */}
      <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-3 pt-2 pb-1">
        {/* Prominent mobile install prompt when installable */}
        <PWAInstallButton variant="home" />

        <div className="w-full flex items-center justify-center gap-3">
          <button
            id="btn-home-rules"
            onClick={() => {
              sounds.playClick();
              onOpenRules();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-[#131815]/80 hover:bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
          >
            <HelpCircle className="w-4 h-4 text-[#8FA095]" />
            <span>شرح اللعبة</span>
          </button>

          <button
            id="btn-home-settings"
            onClick={() => {
              sounds.playClick();
              onOpenSettings();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-[#131815]/80 hover:bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
          >
            <Settings className="w-4 h-4 text-[#8FA095]" />
            <span>الإعدادات</span>
          </button>
        </div>

        {/* Creator Signature */}
        <div
          dir="ltr"
          className="flex items-center justify-center gap-1.5 opacity-70 transition-opacity duration-300 pointer-events-none select-none tracking-[0.12em] text-[11px] text-[#8FA095] font-medium normal-case"
        >
          <span className="w-1 h-1 rounded-full bg-[#22C55E]/80 inline-block" />
          <span>By : Marwan M. Hammad</span>
        </div>
      </div>
    </div>
  );
};
