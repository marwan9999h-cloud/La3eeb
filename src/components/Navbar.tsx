import React, { useState } from 'react';
import { Volume2, VolumeX, HelpCircle, RotateCcw, Settings } from 'lucide-react';
import { sounds } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onResetGame: () => void;
  onOpenRules: () => void;
  onOpenSettings?: () => void;
  onGoHome?: () => void;
  currentRound?: number;
  isGameActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onResetGame,
  onOpenRules,
  onOpenSettings,
  onGoHome,
  currentRound,
  isGameActive,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const handleToggleMute = () => {
    const nextState = sounds.toggleMute();
    setIsMuted(nextState);
    if (!nextState) {
      sounds.playClick();
    }
  };

  return (
    <header className="w-full bg-[#0B0D0C]/95 backdrop-blur-md border-b border-[#212823] sticky top-0 z-40 select-none">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo / Title */}
        <div
          onClick={() => {
            if (!isGameActive && onGoHome) {
              sounds.playClick();
              onGoHome();
            }
          }}
          className={`flex items-center gap-2.5 ${!isGameActive ? 'cursor-pointer' : ''}`}
        >
          <div className="w-9 h-9 rounded-xl bg-[#131815] border theme-accent-border flex items-center justify-center text-lg shadow-sm">
            ⚽
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-black text-base sm:text-lg text-[#EEF2EF] leading-tight tracking-tight">
                خَمِّن اللاعب
              </h1>
            </div>
            {isGameActive && currentRound ? (
              <span className="text-[11px] theme-accent-text font-bold block">
                الجولة {currentRound}
              </span>
            ) : (
              <span className="text-[10px] text-[#8FA095] block font-medium">
                لعبة الأصحاب
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* In-app PWA install trigger */}
          <PWAInstallButton variant="nav" />

          {/* Rules / Help */}
          <button
            id="btn-rules-nav"
            onClick={() => {
              sounds.playClick();
              onOpenRules();
            }}
            title="شرح اللعبة"
            className="py-2 px-3 rounded-xl bg-[#131815] hover:bg-[#171E1A] text-[#EEF2EF] border border-[#212823] transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 theme-accent-text" />
            <span className="hidden sm:inline">شرح اللعبة</span>
          </button>

          {/* Sound Toggle */}
          <button
            id="btn-sound-toggle-nav"
            onClick={handleToggleMute}
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
            className="p-2 rounded-xl bg-[#131815] hover:bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 theme-accent-text" />
            )}
          </button>

          {/* Settings Trigger */}
          {onOpenSettings && (
            <button
              id="btn-settings-nav"
              onClick={() => {
                sounds.playClick();
                onOpenSettings();
              }}
              title="الإعدادات"
              className="p-2 rounded-xl bg-[#131815] hover:bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[#8FA095]" />
            </button>
          )}

          {/* Reset / New Game when Game Active */}
          {isGameActive && (
            <button
              id="btn-reset-game-nav"
              onClick={() => {
                sounds.playClick();
                setShowConfirmReset(true);
              }}
              title="إعادة ضبط اللعبة"
              className="p-2 rounded-xl bg-[#131815] hover:bg-rose-950/40 text-[#8FA095] hover:text-rose-300 border border-[#212823] hover:border-rose-900/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#131815] border border-[#212823] rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-lg font-black text-[#EEF2EF] mb-1">
                نعيد اللعبة من الأول؟
              </h3>
              <p className="text-xs text-[#8FA095] leading-relaxed">
                كل النقاط والجولات الحالية هتتمسح وهنرجع لشاشة البداية.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowConfirmReset(false);
                  onResetGame();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-colors cursor-pointer"
              >
                أيوه، ابدأ من جديد
              </button>
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] font-semibold text-xs border border-[#212823] transition-colors cursor-pointer"
              >
                لأ، كمل
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
