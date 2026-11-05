import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Check, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sounds } from '../utils/sound';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'home' | 'settings';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'nav',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone, do not display install buttons
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    sounds.playClick();
    if (isInstallable) {
      const accepted = await promptInstall();
      if (accepted) {
        sounds.playSuccess();
        setInstallSuccess(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // General prompt for desktop or unsupported browsers
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {variant === 'nav' && (
        <button
          id="btn-install-pwa-nav"
          onClick={handleInstallClick}
          title="تثبيت التطبيق على جهازك"
          className={`py-2 px-3 rounded-xl bg-[#131815] hover:bg-[#171E1A] text-[#EEF2EF] border border-[#212823] hover:border-[#22C55E]/40 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 theme-accent-text" />
          <span className="hidden md:inline">تثبيت اللعبة</span>
        </button>
      )}

      {variant === 'home' && (
        <button
          id="btn-install-pwa-home"
          onClick={handleInstallClick}
          className={`w-full py-3 px-4 rounded-2xl bg-[#131815]/90 hover:bg-[#171E1A] text-[#EEF2EF] border border-[#212823] hover:border-[#22C55E]/40 text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4 theme-accent-text" />
          <span>تثبيت اللعبة كتطبيق على موبايلك 📲</span>
        </button>
      )}

      {variant === 'settings' && (
        <button
          id="btn-install-pwa-settings"
          onClick={handleInstallClick}
          className={`w-full py-3 px-4 rounded-2xl bg-[#131815] hover:bg-[#171E1A] text-[#EEF2EF] border border-[#212823] hover:border-[#22C55E]/40 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#171E1A] border border-[#212823] flex items-center justify-center theme-accent-text">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-right">
              <span className="block font-black text-xs">تثبيت التطبيق على الشاشة الرئيسية</span>
              <span className="block text-[10px] text-[#8FA095]">لتشغيل أسرع وتجربة ملء الشاشة</span>
            </div>
          </div>
          <span className="text-[11px] font-bold theme-accent-text px-2 py-1 rounded-lg bg-[#171E1A] border border-[#212823]">
            تثبيت
          </span>
        </button>
      )}

      {/* iOS & General Installation Guide Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-[#131815] border border-[#212823] rounded-3xl p-5 sm:p-6 max-w-sm w-full text-right shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#212823] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-sm theme-accent-border theme-accent-tint">
                  📲
                </div>
                <h3 className="text-base font-black text-[#EEF2EF]">
                  {isIOS ? 'إضافة اللعبة للآيفون' : 'تثبيت اللعبة كتطبيق'}
                </h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-xl bg-[#171E1A] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-[#8FA095]">
                <p className="text-sm font-bold text-[#EEF2EF]">
                  خطوتين سريعتين لتثبيت اللعبة من Safari:
                </p>

                <div className="p-3 rounded-2xl bg-[#171E1A] border border-[#212823] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#131815] border border-[#212823] flex items-center justify-center shrink-0 theme-accent-text">
                    <Share className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#EEF2EF] block mb-0.5">1. اضغط زر المشاركة (Share)</span>
                    <span>الموجود في شريط متصفح Safari أسفل الشاشة.</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#171E1A] border border-[#212823] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-[#131815] border border-[#212823] flex items-center justify-center shrink-0 theme-accent-text">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-[#EEF2EF] block mb-0.5">2. اختار "إضافة إلى الشاشة الرئيسية"</span>
                    <span>(Add to Home Screen) عشان تفتح اللعبة بدون شريط المتصفح كأنها تطبيق أصلي!</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-[#8FA095]">
                <p className="text-sm font-bold text-[#EEF2EF]">
                  طريقة إضافة اللعبة إلى جهازك:
                </p>
                <div className="p-3 rounded-2xl bg-[#171E1A] border border-[#212823] space-y-2">
                  <div className="flex items-center gap-2 text-[#EEF2EF] font-bold">
                    <Smartphone className="w-4 h-4 theme-accent-text" />
                    <span>من قائمة المتصفح (الثلاث نقاط):</span>
                  </div>
                  <p>
                    اضغط على خيارات المتصفح واختار <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 px-4 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
            >
              فهمت، شكراً 👍
            </button>
          </div>
        </div>
      )}
    </>
  );
};
