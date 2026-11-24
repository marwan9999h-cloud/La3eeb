import { clubLabel } from '../utils/scoring';
import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Player, PlayerProfile, RoundEndReason } from '../types';
import { sounds } from '../utils/sound';

interface RoundResultProps {
  roundNumber: number;
  picker: Player;
  winner: Player | null;
  profile: PlayerProfile;
  pickerPoints: number;
  winnerPoints: number;
  questionsUsedByWinner: number;
  nextPickerName: string;
  isEndOfCycle: boolean;
  roundEndReason?: RoundEndReason;
  onNextRound: () => void;
  onShowCycleSummary: () => void;
}

export const RoundResult: React.FC<RoundResultProps> = ({
  roundNumber,
  picker,
  winner,
  profile,
  pickerPoints,
  winnerPoints,
  questionsUsedByWinner,
  nextPickerName,
  isEndOfCycle,
  roundEndReason,
  onNextRound,
  onShowCycleSummary,
}) => {
  const handleProceed = () => {
    sounds.playSelect();
    if (isEndOfCycle) {
      onShowCycleSummary();
    } else {
      onNextRound();
    }
  };

  const getNobodyWonHeadline = () => {
    if (roundEndReason === 'timer_expired') {
      return {
        title: '⏰ الوقت خلص ومحدش عرفه!',
        subtitle: `صاحب الجولة ${picker.name} خد 8 نقاط كاملة لأن الوقت انتهى ومحدش وصل للحل.`,
      };
    }
    if (roundEndReason === 'all_guesses_used') {
      return {
        title: '🎯 كل التخمينات خلصت ومحدش عرفه!',
        subtitle: `صاحب الجولة ${picker.name} خد 8 نقاط كاملة عشان حير كل المخمنين.`,
      };
    }
    return {
      title: 'محدش عرفه 😂',
      subtitle: `صاحب الجولة ${picker.name} خد 8 نقاط كاملة عشان حير الصحاب!`,
    };
  };

  const nobodyWonInfo = getNobodyWonHeadline();

  return (
    <div className="w-full max-w-lg mx-auto py-6 px-4 text-center select-none">
      {/* Round Finished Badge */}
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-black tracking-wider uppercase mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        <span>الجولة {roundNumber} خلصت 🎯</span>
      </div>

      {/* Main Status Headline */}
      {winner ? (
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1">
            <span className="text-[#22C55E]">{winner.name}</span> عرف اللاعب! 🎯
          </h2>
          <p className="text-xs sm:text-sm text-[#8FA095]">
            استخدم {questionsUsedByWinner} {questionsUsedByWinner === 1 ? 'سؤال' : 'أسئلة'} وخد {winnerPoints - 10} بونص ذكاء!
          </p>
        </div>
      ) : (
        <div className="mb-5">
          <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1">
            {nobodyWonInfo.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#8FA095]">
            {nobodyWonInfo.subtitle}
          </p>
        </div>
      )}

      {/* Revealed Player Card */}
      <div className="bg-[#131815] p-5 sm:p-6 rounded-3xl border border-[#212823] shadow-2xl mb-5 relative overflow-hidden text-right">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-[#22C55E]" />

        <div className="text-center mb-4">
          <span className="text-[11px] font-bold text-[#8FA095] block mb-1">
            اللاعب كان:
          </span>
          <h3 className="text-2xl font-black text-[#22C55E]">
            {profile.displayName}
          </h3>
          <span className="text-xs text-[#8FA095]">{profile.playerName}</span>
        </div>

        {profile.isCustomOrSecret ? (
          <div className="bg-[#171E1A] p-4 rounded-2xl border border-amber-500/20 text-center space-y-1 mb-2">
            <span className="text-amber-400 text-xs font-black flex items-center justify-center gap-1">
              <span>🤫</span>
              <span>لاعب تم اختياره في السر دون بحث</span>
            </span>
            <p className="text-[11px] text-[#8FA095]">
              صاحب الجولة جاوب الأصحاب بنعم أو لا اعتماداً على معلوماته الخاصة!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs bg-[#171E1A] p-3.5 rounded-2xl border border-[#212823] mb-2">
            <div>
              <span className="text-[#5C6B61] block mb-0.5">الجنسية</span>
              <span className="font-bold text-[#EEF2EF]">{profile.nationality}</span>
            </div>
            <div>
              <span className="text-[#5C6B61] block mb-0.5">المركز</span>
              <span className="font-bold text-[#EEF2EF]">{profile.position}</span>
            </div>
            <div className="col-span-2 pt-1.5 border-t border-[#212823]">
              <span className="text-[#5C6B61] block mb-0.5">
                {clubLabel(profile)}
              </span>
              <span className="font-bold text-[#EEF2EF]">
                {profile.currentClub || profile.lastClub}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Points Calculation Card */}
      <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] mb-5 space-y-2.5">
        <h4 className="font-bold text-xs text-[#8FA095] uppercase tracking-wider text-right">
          النقاط المكتسبة في الجولة 🏆
        </h4>

        {winner && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#171E1A] border border-[#212823]">
            <div className="text-right">
              <span className="font-black text-sm text-[#EEF2EF] block">
                {winner.name} (المخمن الفائز)
              </span>
              <span className="text-[11px] text-[#8FA095]">
                10 نقاط أساسية + {winnerPoints - 10} بونص أسئلة أقل
              </span>
            </div>
            <span className="text-lg font-black text-[#22C55E]">
              +{winnerPoints}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#171E1A] border border-[#212823]">
          <div className="text-right">
            <span className="font-black text-sm text-[#EEF2EF] block">
              {picker.name} (صاحب الجولة)
            </span>
            <span className="text-[11px] text-[#8FA095]">
              {winner
                ? '0 نقطة (لأن اللاعب اتعرف في الجولة)'
                : '+8 نقاط (محدش عرف اللاعب خالص)'}
            </span>
          </div>
          <span className={`text-lg font-black ${pickerPoints > 0 ? 'text-sky-400' : 'text-[#8FA095]'}`}>
            {pickerPoints > 0 ? `+${pickerPoints}` : '0'}
          </span>
        </div>
      </div>

      {/* Next Step Button */}
      <button
        id="btn-next-round-proceed"
        onClick={handleProceed}
        className="w-full py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98]"
      >
        {isEndOfCycle ? (
          <>
            <span>الدورة خلصت — عرض النتيجة 🏆</span>
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </>
        ) : (
          <>
            <span>الدور الجاي على {nextPickerName}</span>
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </>
        )}
      </button>
    </div>
  );
};
