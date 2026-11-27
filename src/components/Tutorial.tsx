import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { sounds } from '../utils/sound';
import { TUTORIAL_STEPS } from '../utils/tutorial';

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optional: closing the last step can jump straight into a new game. */
  onStartGame?: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ isOpen, onClose, onStartGame }) => {
  const [stepIndex, setStepIndex] = useState(0);

  // Always reopen on the first step, and allow Escape to dismiss.
  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalSteps = TUTORIAL_STEPS.length;
  const step = TUTORIAL_STEPS[Math.min(stepIndex, totalSteps - 1)];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  const goNext = () => {
    sounds.playClick();
    if (isLast) {
      onClose();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const goPrev = () => {
    sounds.playClick();
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div
      id="tutorial-modal"
      dir="rtl"
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none"
    >
      <div className="bg-[#131815] border border-[#212823] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#212823] flex items-center justify-between bg-[#171E1A]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <div>
              <h2 className="font-black text-base sm:text-lg text-[#EEF2EF]">كيف تلعب خَمّن اللاعب؟</h2>
              <p className="text-[11px] text-[#8FA095]">
                الخطوة {stepIndex + 1} من {totalSteps}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-tutorial-close"
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            aria-label="إغلاق الشرح"
            className="p-1.5 rounded-xl bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 pt-4 px-5">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`الخطوة ${index + 1}`}
              onClick={() => {
                sounds.playClick();
                setStepIndex(index);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                index === stepIndex
                  ? 'w-7 bg-[#22C55E]'
                  : index < stepIndex
                  ? 'w-4 bg-[#22C55E]/50'
                  : 'w-4 bg-[#212823]'
              }`}
            />
          ))}
        </div>

        {/* Step body */}
        <div className="p-5 sm:p-6 overflow-y-auto text-right space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/25 text-[#22C55E] flex items-center justify-center text-3xl mx-auto">
            {step.emoji}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-[#EEF2EF] text-center leading-snug">
            {step.title}
          </h3>
          <p className="text-xs sm:text-sm leading-relaxed text-[#8FA095] text-center">{step.body}</p>
          {step.tip && (
            <div className="bg-[#171E1A] border border-[#212823] rounded-2xl p-3 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
              <span className="text-[11px] sm:text-xs text-[#8FA095] leading-relaxed">{step.tip}</span>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="p-4 sm:p-5 border-t border-[#212823] bg-[#0F1311] space-y-2.5">
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                id="btn-tutorial-prev"
                onClick={goPrev}
                className="flex-1 py-3 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] border border-[#212823] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            )}
            <button
              type="button"
              id={isLast ? 'btn-tutorial-finish' : 'btn-tutorial-next'}
              onClick={goNext}
              className="flex-[1.6] py-3 rounded-xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>تمام، فهمت</span>
                </>
              ) : (
                <>
                  <span>التالي</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {isLast && onStartGame ? (
            <button
              type="button"
              id="btn-tutorial-play"
              onClick={() => {
                sounds.playSelect();
                onClose();
                onStartGame();
              }}
              className="w-full py-2.5 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] text-[#22C55E] border border-[#22C55E]/40 font-bold text-xs transition-colors cursor-pointer"
            >
              يلا نلعب دلوقتي ⚽
            </button>
          ) : (
            <button
              type="button"
              id="btn-tutorial-skip"
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="w-full py-2 text-[11px] font-bold text-[#5C6B61] hover:text-[#8FA095] transition-colors cursor-pointer"
            >
              تخطي الشرح
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
