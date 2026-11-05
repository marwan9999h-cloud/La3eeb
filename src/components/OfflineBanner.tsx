import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestoredNotice(false);
    } else if (wasOffline) {
      // Show brief gentle reconnection toast, then dismiss
      setShowRestoredNotice(true);
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // If online and not displaying brief restored notification, render nothing
  if (isOnline && !showRestoredNotice) {
    return null;
  }

  // Brief gentle "Connection Restored" indicator
  if (isOnline && showRestoredNotice) {
    return (
      <aside
        aria-live="polite"
        className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300 select-none max-w-[92vw] sm:max-w-md w-full"
      >
        <div className="mx-auto flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-[#131815]/95 border border-[#22C55E]/40 text-[#22C55E] text-xs font-bold shadow-xl backdrop-blur-md">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>رجعت أونلاين! تقدر تستخدم ميزات البحث الكاملة ⚡</span>
        </div>
      </aside>
    );
  }

  // Active offline indicator - Non-intrusive floating pill at bottom, never blocks game controls
  return (
    <aside
      aria-live="assertive"
      className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 select-none pointer-events-auto max-w-[92vw] sm:max-w-xs"
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#171E1A]/95 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-2xl backdrop-blur-md">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
        </span>
        <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span className="truncate">
          مفيش نت — اللعبة المحلية شغالة 🤫
        </span>
      </div>
    </aside>
  );
};
