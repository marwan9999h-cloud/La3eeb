import React, { useEffect, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { sounds } from '../utils/sound';

interface PWAUpdateNotificationProps {
  isGameActive?: boolean;
}

export const PWAUpdateNotification: React.FC<PWAUpdateNotificationProps> = ({
  isGameActive = false,
}) => {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodically check for service worker updates every hour
      if (r) {
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA Service Worker registration error:', error);
    },
  });

  // If dismissed or no update ready, render nothing
  if (!needRefresh || dismissed) {
    return null;
  }

  // During active gameplay round, suppress intrusive popups; notify subtly in navbar/banner
  const handleUpdate = () => {
    sounds.playClick();
    updateServiceWorker(true);
  };

  const handleDismiss = () => {
    sounds.playClick();
    setDismissed(true);
  };

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-3 left-3 sm:bottom-4 sm:left-4 z-50 select-none animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[94vw] sm:max-w-sm"
    >
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#171E1A]/95 border border-[#22C55E]/40 text-[#EEF2EF] shadow-2xl backdrop-blur-md space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/30 flex items-center justify-center text-sm theme-accent-border theme-accent-tint">
              <Sparkles className="w-3.5 h-3.5 theme-accent-text" />
            </div>
            <span className="font-black text-xs text-[#EEF2EF]">
              في تحديث جديد للعبة! 🚀
            </span>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
            title="تأجيل"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-[#8FA095] leading-relaxed">
          {isGameActive
            ? 'تقدر تكمل الجولة براحتك وتحدث اللعبة بعد ما تخلصوا اللعب.'
            : 'اضغط تحديث لتطبيق أحدث التحسينات وميزات اللعب فوراً.'}
        </p>

        <div className="flex items-center gap-2 pt-0.5">
          <button
            type="button"
            id="btn-apply-pwa-update"
            onClick={handleUpdate}
            className="flex-1 py-2 px-3 rounded-xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] theme-accent-bg font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
          >
            <RefreshCw className="w-3 h-3 stroke-[2.5]" />
            <span>تحديث الآن</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl bg-[#131815] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] font-semibold text-xs border border-[#212823] transition-colors cursor-pointer"
          >
            بعدين
          </button>
        </div>
      </div>
    </aside>
  );
};
