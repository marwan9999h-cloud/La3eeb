import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw } from 'lucide-react';
import { Player } from '../types';
import { sounds } from '../utils/sound';
import { rankPlayers } from '../utils/ranking';

interface GameOverProps {
  players: Player[];
  totalRounds: number;
  onPlayAgain: () => void;
}

export const GameOver: React.FC<GameOverProps> = ({
  players,
  totalRounds,
  onPlayAgain,
}) => {
  const rankedList = rankPlayers(players);
  const champions = rankedList.filter((rp) => rp.rank === 0);
  const isTie = champions.length > 1;
  const singleChampion = champions.length === 1 ? champions[0].player : null;
  const sharedScore = champions[0]?.player.score ?? 0;

  useEffect(() => {
    sounds.playVictory();
    // Fire festive confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22C55E', '#38BDF8', '#F59E0B', '#EF4444'],
      });
    } catch {
      // safe fallback
    }
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto py-6 sm:py-8 px-4 text-center select-none">
      {/* Celebration Icon */}
      <div className="relative inline-block mb-3">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-4xl text-amber-400 mx-auto shadow-2xl">
          🏆
        </div>
        <span className="absolute -top-2 -right-2 text-2xl animate-bounce">
          👑
        </span>
      </div>

      {/* Main Title */}
      <h2 className="text-3xl sm:text-4xl font-black text-[#EEF2EF] mb-1 tracking-tight">
        خلصنا اللعبة!
      </h2>
      <p className="text-xs sm:text-sm text-[#8FA095] mb-5">
        {isTie ? 'المركز الأول مشترك بالتعادل:' : 'الفائز بالمركز الأول وبطل القعدة هو:'}
      </p>

      {/* Winner Hero Card */}
      {champions.length > 0 && (
        <div className="bg-[#131815] p-5 sm:p-6 rounded-3xl border-2 border-[#22C55E] shadow-2xl mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-[#22C55E]" />

          {isTie ? (
            <>
              <div className="flex items-center justify-center gap-2 text-xl sm:text-2xl font-black text-[#22C55E] mb-1">
                <span>🤝</span>
                <span>تعادل بين: {champions.map((c) => c.player.name).join(' و ')}</span>
              </div>
              <div className="text-3xl font-black text-[#EEF2EF] mb-2.5">
                {sharedScore} <span className="text-sm text-[#8FA095] font-normal">نقطة</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171E1A] text-xs font-bold text-[#8FA095]">
                <span>تساووا في المركز الأول بنفس عدد النقاط ⚽</span>
              </div>
            </>
          ) : (
            singleChampion && (
              <>
                <div className="flex items-center justify-center gap-2 text-2xl font-black text-[#22C55E] mb-1">
                  <span>🥇</span>
                  <span>{singleChampion.name}</span>
                </div>

                <div className="text-3xl font-black text-[#EEF2EF] mb-2.5">
                  {singleChampion.score} <span className="text-sm text-[#8FA095] font-normal">نقطة</span>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171E1A] text-xs font-bold text-[#8FA095]">
                  <span>خمن {singleChampion.correctGuesses} لاعبين صح ⚽</span>
                </div>
              </>
            )
          )}
        </div>
      )}

      {/* Final Full Leaderboard */}
      <div className="bg-[#131815] p-5 rounded-3xl border border-[#212823] shadow-xl mb-6 space-y-2">
        <h4 className="font-black text-xs text-[#8FA095] uppercase tracking-wider text-right mb-2">
          الترتيب النهائي لجميع اللاعبين
        </h4>

        {rankedList.map(({ player, rank }) => (
          <div
            key={player.id}
            className={`p-3.5 rounded-2xl border text-right flex items-center justify-between ${
              rank === 0
                ? 'bg-[#15231A] border-[#22C55E]/40 text-[#EEF2EF]'
                : 'bg-[#171E1A] border-[#212823] text-[#EEF2EF]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`}
              </span>
              <div>
                <span className="font-black text-sm block">{player.name}</span>
                <span className="text-[11px] text-[#8FA095]">
                  تخمينات صحيحة: {player.correctGuesses}
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
        ))}
      </div>

      {/* Play Again Button */}
      <button
        id="btn-play-again-full"
        onClick={() => {
          sounds.playSelect();
          onPlayAgain();
        }}
        className="w-full py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98]"
      >
        <RotateCcw className="w-5 h-5 stroke-[2.5]" />
        <span>نلعب ماتش جديد من الأول</span>
      </button>
    </div>
  );
};
