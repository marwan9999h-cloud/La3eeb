import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Zap,
  WifiOff,
  ShieldAlert,
} from 'lucide-react';
import { PlayerCandidate } from '../types';
import { sounds } from '../utils/sound';
import { SearchLoadingCard } from './SearchLoadingCard';
import { fetchWithTimeout, API_TIMEOUTS } from '../utils/api';

interface PlayerSearchProps {
  pickerName: string;
  onSelectCandidate: (candidate: PlayerCandidate) => void;
  onSelectSecretInMind: (customName?: string) => void;
}

interface SearchErrorInfo {
  type: 'QUOTA_EXHAUSTED' | 'NETWORK_ERROR' | 'NOT_FOUND' | 'GENERIC';
  message: string;
  canDirectPlay: boolean;
  suggestedCandidate?: PlayerCandidate;
}

const QUICK_INSPIRATIONS = [
  'محمد صلاح',
  'ليونيل ميسي',
  'كريستيانو رونالدو',
  'زين الدين زيدان',
  'كيليان مبابي',
  'إمام عاشور',
  'شيكابالا',
  'أندريس إنييستا',
  'إيرلينج هالاند',
  'لوكا مودريتش',
  'نيمار',
  'كريم بنزيما',
];

export const PlayerSearch: React.FC<PlayerSearchProps> = ({
  pickerName,
  onSelectCandidate,
  onSelectSecretInMind,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<SearchErrorInfo | null>(null);
  const [candidates, setCandidates] = useState<PlayerCandidate[] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSearch = async (searchQuery?: string, isAutoRetry = false) => {
    const q = (searchQuery || query).trim();
    if (q.length < 2) {
      setErrorInfo({
        type: 'GENERIC',
        message: 'اكتب حرفين على الأقل عشان ندور على اللاعب.',
        canDirectPlay: false,
      });
      sounds.playDeduct();
      return;
    }

    if (!isAutoRetry) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
    }

    setLoading(true);
    setErrorInfo(null);
    setCandidates(null);
    if (!isAutoRetry) sounds.playClick();

    try {
      const res = await fetchWithTimeout(
        '/api/search-player',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
          signal: abortControllerRef.current?.signal,
        },
        API_TIMEOUTS.SEARCH
      );

      const data = await res.json();

      // Check if server returned quota exhaustion
      if (data.errorCode === 'QUOTA_EXHAUSTED') {
        sounds.playDeduct();
        setErrorInfo({
          type: 'QUOTA_EXHAUSTED',
          message:
            data.error ||
            'تم استنفاد حصة البحث الذكي مؤقتاً. يمكنك المتابعة فوراً باللعب في سرك دون انقطاع الجولة.',
          canDirectPlay: true,
          suggestedCandidate: data.planB?.suggestedCandidate,
        });
        return;
      }

      if (data.errorCode === 'RATE_LIMITED') {
        sounds.playDeduct();
        setErrorInfo({
          type: 'QUOTA_EXHAUSTED',
          message: data.error || 'تجاوزت الحد المسموح، استنى ثواني وجرب تاني.',
          canDirectPlay: true,
        });
        return;
      }

      if (data.errorCode === 'NETWORK_ERROR') {
        if (!isAutoRetry) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          return await handleSearch(q, true);
        }
        sounds.playDeduct();
        setErrorInfo({
          type: 'NETWORK_ERROR',
          message:
            data.error ||
            'تعذر الاتصال بالخادم بسبب ضعف الشبكة. يمكنك إعادة المحاولة أو اللعب به في سرك.',
          canDirectPlay: true,
          suggestedCandidate: data.planB?.suggestedCandidate,
        });
        return;
      }

      if (!res.ok || data.error) {
        sounds.playDeduct();
        const isNotFound = res.status === 404 || data.errorCode === 'PLAYER_NOT_FOUND';
        setErrorInfo({
          type: isNotFound ? 'NOT_FOUND' : 'GENERIC',
          message:
            data.error ||
            'مش لاقيين لاعب بالاسم ده في الأرشيف الكروي. اتأكد من كتابة الاسم صح أو العب به في سرك.',
          canDirectPlay: true,
          suggestedCandidate: data.planB?.suggestedCandidate,
        });
        return;
      }

      if (data.exactMatch && data.candidates && data.candidates.length === 1) {
        sounds.playSuccess();
        onSelectCandidate(data.candidates[0]);
      } else if (data.candidates && data.candidates.length > 0) {
        sounds.playSelect();
        setCandidates(data.candidates);
      } else {
        sounds.playDeduct();
        setErrorInfo({
          type: 'NOT_FOUND',
          message: 'مش لاقيين اللاعب ده، جرب تكتب اسمه بشكل أوضح أو العب به في سرك.',
          canDirectPlay: true,
        });
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      // Single auto-retry on timeout or network error
      if (!isAutoRetry) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        return await handleSearch(q, true);
      }

      sounds.playDeduct();
      setErrorInfo({
        type: 'NETWORK_ERROR',
        message:
          'تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت أو أعد المحاولة، أو تابع مباشرة بنمط «اللاعب في بالك» للحفاظ على الجولة.',
        canDirectPlay: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (name: string) => {
    setQuery(name);
    handleSearch(name);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 sm:py-6 px-4 select-none" dir="rtl">
      {/* Header */}
      <div className="text-center mb-5">
        <span className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3.5 py-1 rounded-full mb-3 inline-block">
          🤫 اختيار سري لـ {pickerName}
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-[#EEF2EF] mb-1.5 tracking-tight">
          اكتب اسم اللاعب
        </h2>
        <p className="text-xs sm:text-sm text-[#8FA095]">
          عربي أو إنجليزي أو لقبه المشهور، وإحنا هنجيب ملفه كامل
        </p>
      </div>

      {/* Search Bar Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="mb-5"
      >
        <div className="relative flex items-center">
          <input
            id="input-player-search"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setErrorInfo(null);
            }}
            placeholder="مثلاً: محمد صلاح، ميسي، رونالدو، هالاند..."
            disabled={loading}
            maxLength={60}
            className="w-full pr-4 pl-28 py-4 bg-[#131815] border border-[#212823] focus:border-[#22C55E] rounded-2xl text-sm font-semibold text-[#EEF2EF] placeholder-[#5C6B61] focus:outline-none transition-colors text-right shadow-lg shadow-black/20"
            autoFocus
          />
          <button
            type="submit"
            id="btn-search-player"
            disabled={loading || query.trim().length < 2}
            className="absolute left-2 py-2.5 px-4 rounded-xl bg-[#22C55E] hover:bg-[#1FA644] active:bg-[#1A8D3A] disabled:opacity-40 text-[#0B0D0C] font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-[#22C55E]/15"
          >
            <Search className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>دور عليه</span>
          </button>
        </div>
      </form>

      {/* Centered Surface Card Loading Component */}
      {loading && (
        <div className="my-4">
          <SearchLoadingCard
            query={query.trim()}
            onInstantSecretPlay={() => {
              sounds.playSuccess();
              onSelectSecretInMind(query.trim() || undefined);
            }}
          />
        </div>
      )}

      {/* Structured Error States (Plan B / Retry / Clear Diagnostics) */}
      {errorInfo && !loading && (
        <div className="mb-5 animate-in fade-in duration-200">
          {/* Case 1: Quota Exhausted Alert */}
          {errorInfo.type === 'QUOTA_EXHAUSTED' && (
            <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-amber-200 shadow-xl space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-300">
                    حصة البحث الذكي بلغت الحد المؤقت ⚠️
                  </h4>
                  <p className="text-xs text-amber-200/90 leading-relaxed mt-1">
                    {errorInfo.message}
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#131815]/80 border border-amber-500/20 text-[11px] text-amber-300/80">
                🔒 حالة الجولة والنقاط والمؤقت محفوظة بالكامل دون أي فقدان للبيانات.
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  id="btn-quota-plan-b-direct"
                  onClick={() => {
                    sounds.playSuccess();
                    onSelectSecretInMind(query.trim() || undefined);
                  }}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B0D0C] font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  <span>كمّل فوراً كلاعب في سرك ({query.trim() || 'اللاعب'}) 🤫</span>
                </button>
                <button
                  type="button"
                  id="btn-quota-retry"
                  onClick={() => handleSearch()}
                  className="w-full sm:w-auto py-3 px-4 rounded-xl bg-[#171E1A] hover:bg-[#1F2722] border border-[#212823] text-amber-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            </div>
          )}

          {/* Case 2: Network / Connectivity Error */}
          {errorInfo.type === 'NETWORK_ERROR' && (
            <div className="p-5 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 shadow-xl space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-cyan-300">
                    تعذر الاتصال بالخادم 📡
                  </h4>
                  <p className="text-xs text-cyan-200/90 leading-relaxed mt-1">
                    {errorInfo.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0B0D0C] font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة 🔄</span>
                </button>
                <button
                  type="button"
                  id="btn-network-secret-play"
                  onClick={() => {
                    sounds.playSuccess();
                    onSelectSecretInMind(query.trim() || undefined);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#171E1A] hover:bg-[#1F2722] border border-cyan-500/30 text-cyan-300 text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>المتابعة كلاعب في سرك لحفظ الجولة ⚡</span>
                </button>
              </div>
            </div>
          )}

          {/* Case 3: Genuine Player Not Found / Generic */}
          {(errorInfo.type === 'NOT_FOUND' || errorInfo.type === 'GENERIC') && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorInfo.message}</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  id="btn-play-secret-fallback"
                  onClick={() => {
                    sounds.playSuccess();
                    onSelectSecretInMind(query.trim() || undefined);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border border-[#22C55E]/30 text-xs font-black transition-colors cursor-pointer"
                >
                  العب به في سرك 🤫
                </button>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="py-1.5 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    جرب تاني
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disambiguation List if multiple candidates */}
      {candidates && candidates.length > 0 && !loading && (
        <div className="bg-[#131815] p-5 rounded-2xl border border-amber-500/30 mb-5 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <span>🤔</span>
            <span>لقيت أكتر من لاعب بالاسم ده، تقصد مين؟</span>
          </div>
          <div className="space-y-2">
            {candidates.map((cand) => (
              <button
                key={cand.id || cand.name}
                id={`candidate-${cand.id}`}
                onClick={() => {
                  sounds.playSuccess();
                  onSelectCandidate(cand);
                }}
                className="w-full p-3.5 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] border border-[#212823] hover:border-[#22C55E]/60 text-right flex items-center justify-between transition-all cursor-pointer group"
              >
                <div>
                  <div className="font-black text-sm text-[#EEF2EF] group-hover:text-[#22C55E] transition-colors">
                    {cand.displayName}
                  </div>
                  <div className="text-xs text-[#8FA095] flex items-center gap-2 mt-0.5">
                    <span>{cand.nationality}</span>
                    <span>•</span>
                    <span>{cand.position}</span>
                    <span>•</span>
                    <span className="text-[#EEF2EF]/90 font-medium">{cand.currentClubOrLast}</span>
                  </div>
                  {cand.eraOrNote && (
                    <div className="text-[11px] text-amber-300/80 mt-1">
                      {cand.eraOrNote}
                    </div>
                  )}
                </div>
                <ArrowLeft className="w-4 h-4 text-[#5C6B61] group-hover:text-[#22C55E] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Suggestions Chips */}
      {!loading && (
        <div className="bg-[#131815] p-5 rounded-2xl border border-[#212823] shadow-md mb-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8FA095] uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>أو اختار لاعب للاقتراح السريع</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_INSPIRATIONS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleChipClick(name)}
                disabled={loading}
                className="py-1.5 px-3 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] hover:text-[#22C55E] border border-[#212823] text-xs font-semibold text-[#8FA095] transition-colors cursor-pointer disabled:opacity-50"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Direct Play In-Mind Option (Offline / Zero-Search Mode) */}
      {!loading && (
        <div className="p-4 rounded-2xl bg-[#131815] border border-[#212823] hover:border-[#22C55E]/40 transition-colors">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
            <div>
              <div className="font-black text-sm text-[#EEF2EF] flex items-center gap-1.5 justify-end sm:justify-start">
                <span>🤫</span>
                <span>عايز تلعب بدون بحث على الإنترنت؟</span>
              </div>
              <p className="text-xs text-[#8FA095] mt-0.5">
                اختار أي لاعب في سرك وجاوب صحابك من معلوماتك الكروية مباشرة
              </p>
            </div>
            <button
              type="button"
              id="btn-play-secret-in-mind"
              onClick={() => {
                sounds.playSuccess();
                onSelectSecretInMind(query.trim() || undefined);
              }}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-[#171E1A] hover:bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
            >
              <span>ابدأ بلاعب في سرك ⚡</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
