import React from 'react';
import { X, Award, CheckCircle2 } from 'lucide-react';
import { sounds } from '../utils/sound';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#131815] border border-[#212823] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#212823] flex items-center justify-between bg-[#171E1A]">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <h2 className="font-black text-base sm:text-lg text-[#EEF2EF]">قواعد اللعبة في دقيقة</h2>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs sm:text-sm leading-relaxed text-right">
          {/* Quick Concept */}
          <div className="bg-[#171E1A] p-4 rounded-2xl border border-[#212823]">
            <h3 className="font-black text-[#22C55E] mb-1.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> فكرة اللعبة ببساطة
            </h3>
            <p className="text-[#8FA095]">
              لعبة تخمين كروية للأصحاب على نفس الجهاز. في كل جولة، واحد بيبقى <strong className="text-[#EEF2EF]">«صاحب الجولة»</strong> ويختار لاعب كرة قدم في سره، ومعاه ملف اللاعب الشامل، والباقيين بيسألوه أسئلة ويحاولوا يعرفوا مين هو بالكلام الحقيقي بينهم.
            </p>
          </div>

          {/* Core Rules List */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 bg-[#171E1A]/60 rounded-2xl border border-[#212823]">
              <span className="text-base mt-0.5">🤫</span>
              <div>
                <strong className="text-[#EEF2EF] block mb-0.5">السرية التامة</strong>
                <span className="text-[#8FA095]">صاحب الجولة بيختار اللاعب وملفه الكروي من غير ما يوري الشاشة لحد، بعدين يسلم الجهاز للباقيين.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-[#171E1A]/60 rounded-2xl border border-[#212823]">
              <span className="text-base mt-0.5">🗣️</span>
              <div>
                <strong className="text-[#EEF2EF] block mb-0.5">الكلام في الحقيقة</strong>
                <span className="text-[#8FA095]">مفيش شات في اللعبة. اللاعبين بيسألوا صاحب الجولة وبيرد عليهم بصوته، واللعبة بتسجل استهلاك الأسئلة والتخمينات.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-[#171E1A]/60 rounded-2xl border border-[#212823]">
              <span className="text-base mt-0.5">⏱️</span>
              <div>
                <strong className="text-[#EEF2EF] block mb-0.5">وقت الجولة (اختياري)</strong>
                <span className="text-[#8FA095]">تقدروا تلعبوا من غير وقت (افتراضي) أو تظبطوا تايمر (دقيقة، دقيقتين، 5، أو 10 دقايق). العداد بيبدأ بس وقت التخمين الفعلي.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-[#171E1A]/60 rounded-2xl border border-[#212823]">
              <span className="text-base mt-0.5">🎯</span>
              <div>
                <strong className="text-[#EEF2EF] block mb-0.5">تخمينة إضافية</strong>
                <span className="text-[#8FA095]">أي مخمن معاه 3 نقاط أو أكتر يقدر يشتري تخمينة واحدة زيادة في الجولة بـ 3 نقاط مخصومة فوراً من رصيده!</span>
              </div>
            </div>
          </div>

          {/* Scoring Table */}
          <div className="bg-[#171E1A] p-4 rounded-2xl border border-[#212823]">
            <h4 className="font-black text-[#EEF2EF] mb-2.5 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#F59E0B]" /> نظام النقاط 🏆
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#212823]">
                <span className="text-[#8FA095]">تخمين صحيح (بدون أي سؤال)</span>
                <span className="font-black text-[#22C55E] text-sm">+13 نقطة</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#212823]">
                <span className="text-[#8FA095]">تخمين صحيح (سؤال واحد)</span>
                <span className="font-black text-[#22C55E] text-sm">+12 نقطة</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#212823]">
                <span className="text-[#8FA095]">تخمين صحيح (سؤالين أو أكتر)</span>
                <span className="font-black text-[#22C55E] text-sm">+11 نقطة</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#212823]">
                <span className="text-[#8FA095]">صاحب الجولة (لو حد عرف اللاعب)</span>
                <span className="font-bold text-[#8FA095] text-sm">0 نقطة</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-[#8FA095]">صاحب الجولة (محدش عرفه / الوقت خلص)</span>
                <span className="font-black text-amber-400 text-sm">+8 نقاط</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#212823] bg-[#171E1A]">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-full py-3.5 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] text-[#0B0D0C] font-black text-sm transition-colors cursor-pointer"
          >
            فهمنا، يلا نلعب! ⚽
          </button>
        </div>
      </div>
    </div>
  );
};
