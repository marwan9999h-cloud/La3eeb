import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  X,
  RefreshCw,
  Trophy,
  Activity,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { PlayerCandidate, PlayerProfile } from '../types';
import { sounds } from '../utils/sound';
import { FootballLoader } from './FootballLoader';
import { fetchWithTimeout, API_TIMEOUTS } from '../utils/api';

interface PlayerConfirmProps {
  candidate: PlayerCandidate;
  pickerName: string;
  onProfileReady: (profile: PlayerProfile) => void;
  onReject: () => void;
}

export const PlayerConfirm: React.FC<PlayerConfirmProps> = ({
  candidate,
  pickerName,
  onProfileReady,
  onReject,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('بندور على اللاعب... 🔎');
  const [error, setError] = useState<string | null>(null);
  const [showPlanBFallback, setShowPlanBFallback] = useState(false);
  const [generatedProfile, setGeneratedProfile] = useState<PlayerProfile | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const fetchPlayerProfile = async (
    mode: 'primary' | 'ai_knowledge' = 'primary',
    isAutoRetry = false
  ) => {
    if (!isAutoRetry) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }

    setLoading(true);
    setError(null);
    setShowPlanBFallback(false);

    if (mode === 'ai_knowledge') {
      setLoadingStep('جاري بناء الملف بمعلومات الـAI... 🤖');
    } else if (isAutoRetry) {
      setLoadingStep('بنعيد المحاولة للتأكيد... 🔄');
    } else {
      setLoadingStep('جاري تجهيز ملف اللاعب... 🔎');
    }

    try {
      const res = await fetchWithTimeout(
        '/api/player-profile',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerName: candidate.name,
            displayName: candidate.displayName,
            nationality: candidate.nationality,
            mode,
          }),
          signal: abortControllerRef.current?.signal,
        },
        API_TIMEOUTS.PROFILE
      );

      const data = await res.json();

      if (res.status === 429 || data.errorCode === 'RATE_LIMITED') {
        sounds.playDeduct();
        setShowPlanBFallback(true);
        setError('تجاوزت الحد المسموح، استنى شوية أو كمّل بمعلومات الـAI.');
        return;
      }

      if (data.profile) {
        sounds.playSuccess();
        setGeneratedProfile(data.profile);
        return;
      }

      // If primary mode failed and not yet retried, auto-retry once
      if (mode === 'primary' && !isAutoRetry) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return await fetchPlayerProfile('primary', true);
      }

      if (mode === 'primary') {
        sounds.playDeduct();
        setShowPlanBFallback(true);
        setError('مش قدرنا نوصل لمعلومات كافية عن اللاعب.');
        return;
      }

      throw new Error(data.error || 'مش قدرنا نجهز المعلومات دلوقتي.');
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      // If error happened during initial primary attempt, auto-retry once
      if (mode === 'primary' && !isAutoRetry) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return await fetchPlayerProfile('primary', true);
      }

      sounds.playDeduct();
      if (mode === 'primary') {
        setShowPlanBFallback(true);
        setError('مش قدرنا نوصل لمعلومات كافية عن اللاعب.');
      } else {
        setError('حصلت مشكلة وإحنا بندور على اللاعب. جرب تاني.');
      }
    } finally {
      setLoading(false);
    }
  };

  // State 1: Plan B Fallback Screen (Primary failed, offer AI Knowledge mode)
  if (showPlanBFallback) {
    return (
      <div className="w-full max-w-lg mx-auto py-6 sm:py-8 px-4 text-center select-none">
        <div className="bg-[#131815] p-6 sm:p-8 rounded-3xl border border-amber-500/40 shadow-2xl mb-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4">
            🤔
          </div>

          <h3 className="text-lg sm:text-xl font-black text-[#EEF2EF] mb-2">
            مش قدرنا نوصل لمعلومات كافية عن اللاعب دلوقتي
          </h3>
          <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 mb-5 text-right">
            ⚠️ <span className="font-bold">تنبيه:</span> ممكن نكمل بمعلومات الـ AI، بس راجعها قبل ما تقولها لصحابك.
          </p>

          <div className="flex flex-col gap-2.5">
            <button
              id="btn-use-ai-knowledge"
              onClick={() => {
                sounds.playClick();
                fetchPlayerProfile('ai_knowledge');
              }}
              className="w-full py-4 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-[#0B0D0C] font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              <span>كمّل بمعلومات الـAI</span>
            </button>

            <div className="flex gap-2.5">
              <button
                id="btn-retry-plan-a"
                onClick={() => {
                  sounds.playClick();
                  fetchPlayerProfile('primary');
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#171E1A] hover:bg-[#1C2520] text-[#EEF2EF] font-bold text-xs border border-[#212823] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>حاول تبحث تاني</span>
              </button>

              <button
                id="btn-cancel-to-search"
                onClick={() => {
                  sounds.playClick();
                  onReject();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-[#171E1A] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
              >
                <span>اختيار لاعب تاني</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Error State with retry button
  if (error && !showPlanBFallback) {
    return (
      <div className="w-full max-w-lg mx-auto py-6 sm:py-8 px-4 text-center select-none">
        <div className="bg-[#131815] p-6 sm:p-8 rounded-3xl border border-rose-900/40 shadow-2xl mb-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center text-3xl mx-auto mb-4">
            ⚠️
          </div>

          <h3 className="text-lg sm:text-xl font-black text-[#EEF2EF] mb-2">
            حصلت مشكلة وإحنا بندور على اللاعب. جرب تاني.
          </h3>
          <p className="text-xs text-[#8FA095] mb-6 leading-relaxed">
            ممكن شبكة النت أو البحث أخد وقت أطول. متقلقش، تقدر تجرب تاني فوراً أو تختار لاعب تاني.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              id="btn-retry-profile"
              onClick={() => {
                sounds.playClick();
                fetchPlayerProfile('primary');
              }}
              className="flex-1 py-3.5 px-5 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] text-[#0B0D0C] font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#22C55E]/15"
            >
              <RefreshCw className="w-4 h-4" />
              <span>جرب تاني</span>
            </button>

            <button
              id="btn-cancel-profile"
              onClick={() => {
                sounds.playClick();
                onReject();
              }}
              className="py-3.5 px-5 rounded-2xl bg-[#171E1A] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
            >
              <span>اختيار لاعب تاني</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Elegant Loading State with FootballLoader
  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto py-8 sm:py-12 px-4 text-center select-none">
        <div className="bg-[#131815] p-8 sm:p-10 rounded-3xl border border-[#212823] shadow-2xl">
          <FootballLoader
            text={loadingStep}
            subText={`تأكد إن باقي اللعيبة مش باصين على الشاشة عشان ${candidate.displayName} سري!`}
            size="lg"
          />
        </div>
      </div>
    );
  }

  // State 4: Profile Ready Preview (Full 6 Sections)
  if (generatedProfile) {
    const isAiKnowledge = generatedProfile.researchMode === 'ai_knowledge';
    const isLocalDb = generatedProfile.researchMode === 'local_db';
    const isUnavailable = generatedProfile.researchMode === 'unavailable';

    const hasStats = Boolean(
      (generatedProfile.appearances && generatedProfile.appearances !== 'غير متاح') ||
      (generatedProfile.goals && generatedProfile.goals !== 'غير متاح') ||
      (generatedProfile.assists && generatedProfile.assists !== 'غير متاح') ||
      (generatedProfile.keyStats && generatedProfile.keyStats.length > 0)
    );

    return (
      <div className="w-full max-w-2xl mx-auto py-4 px-4 text-right space-y-4 select-none">
        {/* Secret Badge & Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full inline-block">
              🤫 ملف اللاعب السري لـ {pickerName}
            </span>
            {isLocalDb ? (
              <span className="text-xs font-bold text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <span>🟢</span> من قاعدة بيانات اللعبة
              </span>
            ) : isAiKnowledge ? (
              <span className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <span>🤖</span> معلومات الـAI
              </span>
            ) : (
              <span className="text-xs font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <span>⚠️</span> مفيش معلومات متاحة
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1 tracking-tight">
            ملف اللاعب جاهز 📋
          </h2>
          <p className="text-xs text-[#8FA095]">
            راجع معلوماته براحتك.. هتقدر تفتح الملف ده في أي وقت في الجولة!
          </p>
        </div>

        {/* Warning Banners */}
        {isAiKnowledge && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>معلومات الـAI مش متحققة من مصادر مباشرة، فراجعها قبل ما تقولها.</span>
          </div>
        )}

        {isUnavailable && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>مفيش معلومات متاحة عن اللاعب ده دلوقتي، هتجاوب من معلوماتك.</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-[#131815] p-5 sm:p-6 rounded-3xl border border-[#212823] shadow-2xl space-y-4">
          {/* Header Info */}
          <div className="flex items-center justify-between bg-[#171E1A] p-4 rounded-2xl border border-[#212823]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-[#EEF2EF]">
                  {generatedProfile.displayName}
                </h3>
                {generatedProfile.shirtNumber && generatedProfile.shirtNumber !== 'غير متاح' && (
                  <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-[#22C55E]/20 text-[#22C55E]">
                    #{generatedProfile.shirtNumber}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#8FA095] block mt-0.5">
                {generatedProfile.playerName}
              </span>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
              {generatedProfile.isRetired ? 'معتزل' : 'لاعب حالي'}
            </span>
          </div>

          {/* Section 1: Basic Information */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
              <span>📌</span> 1. المعلومات الأساسية
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823]">
              <div>
                <span className="text-[#5C6B61] block mb-0.5">الجنسية</span>
                <span className="font-bold text-[#EEF2EF]">{generatedProfile.nationality}</span>
              </div>
              <div>
                <span className="text-[#5C6B61] block mb-0.5">المركز</span>
                <span className="font-bold text-[#EEF2EF]">{generatedProfile.position}</span>
              </div>
              <div>
                <span className="text-[#5C6B61] block mb-0.5">
                  {generatedProfile.isRetired ? 'آخر نادي' : 'النادي الحالي'}
                </span>
                <span className="font-bold text-[#22C55E]">
                  {generatedProfile.currentClub || generatedProfile.lastClub || 'غير محدد'}
                </span>
              </div>
              {generatedProfile.age && generatedProfile.age !== 'غير متاح' && (
                <div>
                  <span className="text-[#5C6B61] block mb-0.5">العمر / الميلاد</span>
                  <span className="font-bold text-[#EEF2EF]">{generatedProfile.age}</span>
                </div>
              )}
              {generatedProfile.nationalTeam && generatedProfile.nationalTeam !== 'غير متاح' && (
                <div className="col-span-2 sm:col-span-2">
                  <span className="text-[#5C6B61] block mb-0.5">المنتخب الوطني</span>
                  <span className="font-bold text-[#EEF2EF]">{generatedProfile.nationalTeam}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Career & Clubs */}
          {generatedProfile.clubs && generatedProfile.clubs.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                <span>🏟️</span> 2. الأندية والمسيرة
              </h4>
              <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {generatedProfile.clubs.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-[#131815] text-[#EEF2EF] border border-[#212823] text-xs font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                {generatedProfile.careerTimeline && generatedProfile.careerTimeline.length > 0 && (
                  <div className="pt-2 border-t border-[#212823]/80 text-xs text-[#8FA095] space-y-1">
                    {generatedProfile.careerTimeline.slice(0, 3).map((tl, i) => (
                      <p key={i}>• {tl}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3 & 4: National Team & Achievements */}
          {generatedProfile.trophies && generatedProfile.trophies.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> 3. البطولات والإنجازات
              </h4>
              <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823]">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#EEF2EF]">
                  {generatedProfile.trophies.slice(0, 6).map((tr, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 shrink-0">🏆</span>
                      <span>{tr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 5: Statistics (No fake numbers) */}
          {hasStats && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> 4. الإحصائيات والأرقام
              </h4>
              <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {generatedProfile.appearances && generatedProfile.appearances !== 'غير متاح' && (
                    <div className="p-2 rounded-xl bg-[#131815] border border-[#212823]">
                      <span className="text-[10px] text-[#5C6B61] block">المشاركات</span>
                      <span className="font-black text-xs text-[#EEF2EF]">{generatedProfile.appearances}</span>
                    </div>
                  )}
                  {generatedProfile.goals && generatedProfile.goals !== 'غير متاح' && (
                    <div className="p-2 rounded-xl bg-[#131815] border border-[#212823]">
                      <span className="text-[10px] text-[#5C6B61] block">الأهداف</span>
                      <span className="font-black text-xs text-[#22C55E]">{generatedProfile.goals}</span>
                    </div>
                  )}
                  {generatedProfile.assists && generatedProfile.assists !== 'غير متاح' && (
                    <div className="p-2 rounded-xl bg-[#131815] border border-[#212823]">
                      <span className="text-[10px] text-[#5C6B61] block">الأسيست</span>
                      <span className="font-black text-xs text-sky-400">{generatedProfile.assists}</span>
                    </div>
                  )}
                </div>
                {generatedProfile.keyStats && generatedProfile.keyStats.length > 0 && (
                  <ul className="text-xs text-[#8FA095] space-y-1 list-disc list-inside pt-1">
                    {generatedProfile.keyStats.slice(0, 2).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Section 6: Additional Facts & Teammates */}
          {((generatedProfile.verifiedFacts?.length || generatedProfile.notableTeammates?.length) ?? false) && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span> 5. حقائق كروية وزملاء
              </h4>
              <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] text-xs text-[#8FA095] space-y-1.5">
                {generatedProfile.verifiedFacts && generatedProfile.verifiedFacts.slice(0, 2).map((f, i) => (
                  <p key={i}>• {f}</p>
                ))}
                {generatedProfile.notableTeammates && generatedProfile.notableTeammates.length > 0 && (
                  <p className="text-[11px] pt-1 text-[#5C6B61]">
                    أبرز من زاملهم: {generatedProfile.notableTeammates.slice(0, 5).join('، ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Ready to Play */}
        <div className="pt-2">
          <button
            id="btn-ready-pass-back"
            onClick={() => {
              sounds.playRoundTransition();
              onProfileReady(generatedProfile);
            }}
            className="w-full py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>تمام، سلّم الجهاز للجماعة وابدأوا الجولة 🚀</span>
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }

  // Initial State: Confirm Candidate Identity
  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-6 px-4 text-center select-none">
      {/* Privacy banner */}
      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full mb-3 inline-block">
        🤫 سري لـ {pickerName} فقط
      </span>

      <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1.5 tracking-tight">
        ده اللاعب اللي تقصده؟
      </h2>
      <p className="text-xs sm:text-sm text-[#8FA095] mb-5">
        تأكد من البيانات عشان نجهز ملفه الكروي الشامل
      </p>

      {/* Player Identity Card */}
      <div className="bg-[#131815] p-6 rounded-3xl border border-[#212823] shadow-2xl mb-6 relative overflow-hidden text-right">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-[#22C55E]" />

        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-[#171E1A] border border-[#22C55E]/30 flex items-center justify-center text-3xl shrink-0 shadow-inner">
            ⚽
          </div>
          <div>
            <h3 className="text-xl font-black text-[#EEF2EF]">
              {candidate.displayName}
            </h3>
            <span className="text-xs text-[#8FA095] font-medium block mt-0.5">
              {candidate.name}
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#22C55E]/10 text-[#22C55E]">
                {candidate.isRetired ? 'معتزل' : 'لاعب حالي'}
              </span>
              {candidate.eraOrNote && (
                <span className="text-[11px] text-[#8FA095]">
                  {candidate.eraOrNote}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-xs bg-[#171E1A] p-4 rounded-2xl border border-[#212823]">
          <div>
            <span className="text-[#5C6B61] block mb-0.5">الجنسية</span>
            <span className="font-bold text-[#EEF2EF]">{candidate.nationality}</span>
          </div>
          <div>
            <span className="text-[#5C6B61] block mb-0.5">المركز</span>
            <span className="font-bold text-[#EEF2EF]">{candidate.position}</span>
          </div>
          <div className="col-span-2 pt-2 border-t border-[#212823]">
            <span className="text-[#5C6B61] block mb-0.5">
              {candidate.isRetired ? 'آخر نادي لعب له' : 'النادي الحالي'}
            </span>
            <span className="font-bold text-[#22C55E]">{candidate.currentClubOrLast}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <button
          id="btn-confirm-player-yes"
          onClick={() => {
            sounds.playSelect();
            fetchPlayerProfile('primary');
          }}
          className="flex-1 py-4 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] text-[#0B0D0C] font-black text-base flex items-center justify-center gap-2 shadow-lg shadow-[#22C55E]/20 transition-all cursor-pointer active:scale-[0.98]"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          <span>أيوه، هو ده اللاعب</span>
        </button>

        <button
          id="btn-confirm-player-no"
          onClick={() => {
            sounds.playClick();
            onReject();
          }}
          className="py-4 px-6 rounded-2xl bg-[#171E1A] hover:bg-[#1C2520] text-[#8FA095] hover:text-[#EEF2EF] font-bold text-sm border border-[#212823] flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
          <span>لأ، أختار لاعب تاني</span>
        </button>
      </div>
    </div>
  );
};
