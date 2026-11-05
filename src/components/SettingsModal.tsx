import React, { useState } from 'react';
import { X, Volume2, VolumeX, RotateCcw, Smartphone, Check, Palette, Sparkles } from 'lucide-react';
import { sounds } from '../utils/sound';
import { PWAInstallButton } from './PWAInstallButton';
import {
  PRESET_THEMES,
  loadStoredTheme,
  saveTheme,
  buildCustomTheme,
  getContrastColor,
  ThemeColors,
} from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetAllData?: () => void;
  isGameActive?: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetAllData,
  isGameActive = false,
}) => {
  const [isMuted, setIsMuted] = useState(sounds.getMuted());
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Theme Customization State
  const [themeState, setThemeState] = useState(() => loadStoredTheme());
  const [customColorInput, setCustomColorInput] = useState(() => themeState.customHex);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ThemeColors) => {
    sounds.playSelect();
    const applied = saveTheme(preset.id, preset.primary);
    setThemeState({
      activeThemeId: preset.id,
      customHex: preset.primary,
      theme: applied,
    });
  };

  const handleCustomColorChange = (hex: string) => {
    setCustomColorInput(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const applied = saveTheme('custom', hex);
      setThemeState({
        activeThemeId: 'custom',
        customHex: hex,
        theme: applied,
      });
    }
  };

  const handleToggleSound = () => {
    const nextState = sounds.toggleMute();
    setIsMuted(nextState);
    if (!nextState) {
      sounds.playClick();
    }
  };

  const handleTestSound = () => {
    if (!isMuted) {
      sounds.playSuccess();
    }
  };

  const handleConfirmReset = () => {
    if (onResetAllData) {
      onResetAllData();
      setResetDone(true);
      setTimeout(() => {
        setResetDone(false);
        setShowConfirmReset(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#131815] border border-[#212823] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-right max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#212823] flex items-center justify-between bg-[#171E1A] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-sm theme-accent-border theme-accent-tint">
              ⚙️
            </div>
            <h2 className="font-black text-base text-[#EEF2EF]">إعدادات اللعبة</h2>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 text-sm text-[#EEF2EF] overflow-y-auto">
          {/* Theme Customization Section */}
          <div className="bg-[#171E1A] p-4 rounded-2xl border border-[#212823] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#131815] border border-[#212823] flex items-center justify-center theme-accent-text">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-black text-sm block">طابع ألوان اللعبة</span>
                  <span className="text-[11px] text-[#8FA095]">اختر لون الملعب المفضل أو حدد لونك</span>
                </div>
              </div>
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm transition-all"
                style={{ backgroundColor: themeState.theme.primary }}
              />
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              {PRESET_THEMES.map((preset) => {
                const isSelected = themeState.activeThemeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    title={preset.name}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#131815] border-white/40 shadow-md scale-105'
                        : 'bg-[#131815]/60 hover:bg-[#131815] border-[#212823] hover:border-[#212823]/80'
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-inner transition-transform group-hover:scale-110"
                      style={{ backgroundColor: preset.primary }}
                    >
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 stroke-[3]"
                          style={{ color: preset.contrastText }}
                        />
                      )}
                    </span>
                    <span className="text-[9px] font-bold mt-1.5 text-[#8FA095] group-hover:text-[#EEF2EF] truncate max-w-full">
                      {preset.id === 'emerald'
                        ? 'أخضر'
                        : preset.id === 'cyan'
                        ? 'سماوي'
                        : preset.id === 'amber'
                        ? 'ذهبي'
                        : preset.id === 'purple'
                        ? 'بنفسجي'
                        : 'قرمزي'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Picker & Preview */}
            <div className="pt-2 border-t border-[#212823]/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="custom-theme-picker"
                  className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#131815] hover:bg-[#1C2520] border border-[#212823] text-xs font-semibold cursor-pointer transition-colors"
                >
                  <input
                    id="custom-theme-picker"
                    type="color"
                    value={customColorInput}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                  />
                  <span className="text-xs text-[#EEF2EF]">لون مخصص</span>
                </label>

                {themeState.activeThemeId === 'custom' && (
                  <span className="text-[10px] text-[#22C55E] theme-accent-text font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    مُفعل
                  </span>
                )}
              </div>

              {/* Sample Live Contrast Badge */}
              <div
                className="px-2.5 py-1 rounded-lg text-[10px] font-black shadow-sm"
                style={{
                  backgroundColor: themeState.theme.primary,
                  color: themeState.theme.contrastText,
                }}
              >
                معاينة الخط ⚽
              </div>
            </div>
          </div>

          {/* Sound Setting */}
          <div className="bg-[#171E1A] p-4 rounded-2xl border border-[#212823] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#131815] border border-[#212823] flex items-center justify-center theme-accent-text">
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div>
                <span className="font-black text-sm block">المؤثرات الصوتية</span>
                <span className="text-xs text-[#8FA095]">
                  {isMuted ? 'الصوت مكتوم حالياً' : 'أصوات التخمين والأزرار شغالة'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isMuted && (
                <button
                  onClick={handleTestSound}
                  title="تجربة الصوت"
                  className="px-2.5 py-1.5 rounded-xl bg-[#131815] hover:bg-[#1C2520] text-xs font-semibold text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
                >
                  تجربة
                </button>
              )}
              <button
                onClick={handleToggleSound}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  !isMuted ? 'theme-accent-bg' : 'bg-[#212823]'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    !isMuted ? 'translate-x-1' : 'translate-x-6'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* PWA Install Action Row */}
          <PWAInstallButton variant="settings" />

          {/* Game Style Info */}
          <div className="bg-[#171E1A] p-4 rounded-2xl border border-[#212823] space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black text-[#22C55E]">
              <Smartphone className="w-4 h-4" />
              <span>طريقة اللعب الجماعية</span>
            </div>
            <p className="text-xs text-[#8FA095] leading-relaxed">
              اللعبة مصممة للقعدة الواقعية مع صحابك على نفس الجهاز بدون إنترنت إضافي أثناء اللعب، والكلام والتخمين بيتم بصوتكم في الحقيقة.
            </p>
          </div>

          {/* Reset Game / Clear Session */}
          {onResetAllData && (
            <div className="pt-1">
              {!showConfirmReset ? (
                <button
                  onClick={() => {
                    sounds.playClick();
                    setShowConfirmReset(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-[#171E1A] hover:bg-rose-950/30 text-[#8FA095] hover:text-rose-300 border border-[#212823] hover:border-rose-900/40 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>إعادة ضبط اللعبة وحذف البيانات المؤقتة</span>
                </button>
              ) : (
                <div className="bg-rose-950/30 border border-rose-900/40 p-4 rounded-2xl text-center space-y-3">
                  <p className="text-xs text-rose-300 font-semibold">
                    متأكد إنك عايز تبدأ من الأول خالص؟ كل النقاط الحالية هتتمسح.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirmReset}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {resetDone ? <Check className="w-4 h-4" /> : 'أيوه، امسح وابدأ'}
                    </button>
                    <button
                      onClick={() => setShowConfirmReset(false)}
                      className="flex-1 py-2.5 rounded-xl bg-[#131815] text-[#EEF2EF] font-semibold text-xs border border-[#212823] transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#212823] text-center bg-[#171E1A]">
          <span className="text-[11px] text-[#5C6B61] block">
            خَمِّن اللاعب ⚽ — النسخة 2.0 • للأصحاب والقعدة
          </span>
        </div>
      </div>
    </div>
  );
};
