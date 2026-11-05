import React from 'react';
import { RotateCw, Flag } from 'lucide-react';
import { Player } from '../types';
import { sounds } from '../utils/sound';
import { rankPlayers } from '../utils/ranking';

interface CycleSummaryProps {
  cycleNumber: number;
  players: Player[];
  onContinueNextCycle: () => void;
  onFinishGame: () => void;
}

export const CycleSummary: React.FC<CycleSummaryProps> = ({
  cycleNumber,
  players,
  onContinueNextCycle,
  onFinishGame,
}) => {
  const rankedList = rankPlayers(players);

  const getRankBadge = (rank: number) => {
    if (rank === 0) return <span className="text-xl">🥇</span>;
    if (rank === 1) return <span className="text-xl">🥈</span>;
    if (rank === 2) return <span className="text-xl">🥉</span>;
    return (
      <span className="w-6 h-6 rounded-full bg-[#171E1A] text-xs font-black text-[#8FA095] flex items-center justify-center border border-[#212823]">
        {rank + 1}
      </span>
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-4 text-center select-none">
      {/* Header */}
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-3xl mb-3 text-amber-400">
        🏆
      </div>
      <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1 tracking-tight">
        الدورة {cycleNumber} خلصت!
      </h2>
      <p className="text-xs sm:text-sm text-[#8FA095] mb-5">
        كل واحد في القعدة كان صاحب الجولة وجرب يحير الباقيين
      </p>

      {/* Leaderboard */}
      <div className="bg-[#131815] p-5 rounded-3xl border border-[#212823] shadow-xl mb-5 space-y-2">
        <h4 className="font-black text-xs text-[#8FA095] uppercase tracking-wider text-right mb-2">
          جدول الترتيب الحالي
        </h4>

        {rankedList.map(({ player, rank }) => {
          const isLeader = rank === 0;
          return (
            <div
              key={player.id}
              className={`p-3.5 rounded-2xl border text-right flex items-center justify-between transition-all ${
                isLeader
                  ? 'bg-[#15231A] border-[#22C55E]/50 text-[#EEF2EF]'
                  : 'bg-[#171E1A] border-[#212823] text-[#EEF2EF]'
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankBadge(rank)}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm block">
                      {player.name}
                    </span>
                    {isLeader && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                        المتصدر
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#8FA095]">
                    خمن صح: {player.correctGuesses} | صاحب الجولة: {player.roundsAsPicker}
                  </span>
                </div>
              </div>
              <div className="text-left">
                <span className="text-base font-black text-[#22C55E]">
                  {player.score}
                </span>
                <span className="text-[10px] text-[#8FA095] block">نقطة</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Continuation Choice */}
      <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] mb-4">
        <h4 className="font-black text-sm text-[#EEF2EF] mb-1">
          نكمل دورة جديدة ولا كفاية كده؟
        </h4>
        <p className="text-xs text-[#8FA095] mb-4">
          لو كملتوا، النقاط الحالية هتفضل زي ما هي وهتبدأوا دورة جديدة.
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            id="btn-continue-next-cycle"
            onClick={() => {
              sounds.playSuccess();
              onContinueNextCycle();
            }}
            className="flex-1 py-3.5 px-5 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] text-[#0B0D0C] font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#22C55E]/15"
          >
            <RotateCw className="w-4 h-4" />
            <span>نكمل دورة جديدة</span>
          </button>

          <button
            id="btn-finish-game-cycle"
            onClick={() => {
              sounds.playVictory();
              onFinishGame();
            }}
            className="py-3.5 px-5 rounded-2xl bg-[#171E1A] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] font-bold text-sm border border-[#212823] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Flag className="w-4 h-4" />
            <span>كفاية كده، خلصنا</span>
          </button>
        </div>
      </div>
    </div>
  );
};
