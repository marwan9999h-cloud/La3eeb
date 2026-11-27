import React, { useState } from 'react';
import { Share2, Check, Loader2 } from 'lucide-react';
import { Player } from '../types';
import { sounds } from '../utils/sound';
import {
  buildGameOverShareModel,
  renderGameOverShareCard,
  shareOrDownloadCard,
} from '../utils/shareCard';

interface ShareResultButtonProps {
  players: Player[];
  totalRounds: number;
}

type ShareState = 'idle' | 'working' | 'shared' | 'downloaded' | 'error';

export const ShareResultButton: React.FC<ShareResultButtonProps> = ({
  players,
  totalRounds,
}) => {
  const [state, setState] = useState<ShareState>('idle');

  const handleShare = async () => {
    if (state === 'working') return;
    sounds.playSelect();
    setState('working');
    try {
      const model = buildGameOverShareModel(players, totalRounds);
      const blob = await renderGameOverShareCard(model);
      const outcome = await shareOrDownloadCard(blob);
      if (outcome === 'cancelled') {
        setState('idle');
        return;
      }
      setState(outcome === 'shared' ? 'shared' : 'downloaded');
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  const label =
    state === 'working'
      ? 'بنجهز كارت النتيجة...'
      : state === 'shared'
        ? 'اتشاركت ✅'
        : state === 'downloaded'
          ? 'الصورة اتحملت ✅'
          : state === 'error'
            ? 'حصلت مشكلة، جرب تاني'
            : 'شارك النتيجة مع الصحاب';

  return (
    <button
      id="btn-share-result"
      onClick={handleShare}
      disabled={state === 'working'}
      className="w-full py-4 px-6 rounded-2xl bg-[#22C55E]/10 hover:bg-[#22C55E]/15 active:bg-[#22C55E]/20 text-[#22C55E] border-2 border-[#22C55E]/40 font-black text-base flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
    >
      {state === 'working' ? (
        <Loader2 className="w-5 h-5 stroke-[2.5] animate-spin" />
      ) : state === 'shared' || state === 'downloaded' ? (
        <Check className="w-5 h-5 stroke-[2.5]" />
      ) : (
        <Share2 className="w-5 h-5 stroke-[2.5]" />
      )}
      <span>{label}</span>
    </button>
  );
};
