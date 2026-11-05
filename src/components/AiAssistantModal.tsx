import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, Unlock } from 'lucide-react';
import { PlayerProfile, AssistantMessage } from '../types';
import { sounds } from '../utils/sound';
import { fetchWithTimeout, API_TIMEOUTS } from '../utils/api';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  pickerName: string;
}

const QUICK_QUESTIONS = [
  'هو لعب في إسبانيا؟',
  'هو لعب في إيطاليا؟',
  'خد دوري أبطال أوروبا؟',
  'كان بيلعب مهاجم؟',
  'لعب في كأس العالم؟',
  'لعب تحت قيادة مورينيو أو جوارديولا؟',
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  profile,
  pickerName,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isUnnamedSecret =
    Boolean(profile.isCustomOrSecret) &&
    (profile.displayName === 'لاعب في السر' ||
      profile.playerName === 'لاعب في السر' ||
      profile.displayName === 'لاعب مختار' ||
      !profile.displayName);

  const [messages, setMessages] = useState<AssistantMessage[]>(() => [
    {
      id: 'init-1',
      sender: 'ai',
      text: isUnnamedSecret
        ? 'مفيش لاعب محدد عشان أساعدك — جاوب من معلوماتك 😉'
        : `أهلاً يا ${pickerName}! أنا معاك في سرك، لو صحابك سألوك سؤال ومش متأكد من إجابته عن ${profile.displayName}، اسألني هنا وهجاوبك على طول.`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSend = async (questionText?: string) => {
    if (isUnnamedSecret) return;

    const q = (questionText || input).trim();
    if (!q || loading) return;

    sounds.playClick();
    const userMsg: AssistantMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetchWithTimeout(
        '/api/ai-assistant',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerProfile: profile,
            question: q.slice(0, 200),
            history: messages.slice(-4),
          }),
          signal: abortControllerRef.current.signal,
        },
        API_TIMEOUTS.ASSISTANT
      );

      const data = await res.json();
      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: data.error || 'الـAI مش قادر يرد دلوقتي.',
            timestamp: Date.now(),
          },
        ]);
        sounds.playDeduct();
        return;
      }

      sounds.playSuccess();
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.answer || 'تمام، المعلومة صحيحة.',
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: 'الـAI مش قادر يرد دلوقتي، جاوب من معلوماتك.',
          timestamp: Date.now(),
        },
      ]);
      sounds.playDeduct();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#131815] border border-[#212823] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col h-[560px] max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-[#212823] flex items-center justify-between bg-[#171E1A]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-black text-sm text-[#EEF2EF] flex items-center gap-1.5">
                <span>مساعد الـ AI</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300">
                  سري لـ {pickerName}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              setIsUnlocked(false);
              onClose();
            }}
            className="p-1.5 rounded-xl bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safeguard if not unlocked */}
        {!isUnlocked ? (
          <div className="p-8 text-center my-auto">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-3xl mx-auto mb-4">
              🤖
            </div>
            <h3 className="text-lg font-black text-[#EEF2EF] mb-1.5">
              الشاشة دي لـ {pickerName} فقط!
            </h3>
            <p className="text-xs text-[#8FA095] max-w-xs mx-auto mb-6">
              تأكد إن الباقيين مش باصين عشان الشات هيكون فيه اسم اللاعب وإجابات دقيقة عنه.
            </p>
            <button
              id="btn-unlock-ai"
              onClick={() => {
                sounds.playSelect();
                setIsUnlocked(true);
              }}
              className="py-3.5 px-6 rounded-2xl bg-sky-500 hover:bg-sky-400 text-[#0B0D0C] font-black text-xs flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-md shadow-sky-500/20"
            >
              <Unlock className="w-4 h-4" />
              <span>أنا {pickerName}، افتح المساعد</span>
            </button>
          </div>
        ) : (
          <>
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs text-right">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl shrink-0 flex items-center justify-center text-xs font-black ${
                      msg.sender === 'user'
                        ? 'bg-[#22C55E] text-[#0B0D0C]'
                        : 'bg-sky-500/20 border border-sky-500/30 text-sky-300'
                    }`}
                  >
                    {msg.sender === 'user' ? 'أنت' : 'AI'}
                  </div>
                  <div
                    className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#EEF2EF]'
                        : 'bg-[#171E1A] border border-[#212823] text-[#EEF2EF]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-sky-400 text-xs p-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>بيفكر في الإجابة...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts Chips */}
            {!isUnnamedSecret && (
              <div className="p-2.5 border-t border-[#212823] bg-[#0E1210] flex gap-1.5 overflow-x-auto whitespace-nowrap">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="py-1.5 px-3 rounded-xl bg-[#171E1A] hover:bg-[#1C2520] hover:text-sky-300 border border-[#212823] text-[11px] text-[#8FA095] transition-colors cursor-pointer shrink-0 disabled:opacity-50 font-medium"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-[#212823] bg-[#131815] flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isUnnamedSecret
                    ? 'المساعد مش متاح للاعب في السر بدون اسم...'
                    : 'اكتب سؤالك عن اللاعب بالمصري...'
                }
                disabled={loading || isUnnamedSecret}
                maxLength={200}
                className="flex-1 py-2.5 px-3.5 bg-[#171E1A] border border-[#212823] focus:border-sky-400 rounded-xl text-xs font-semibold text-[#EEF2EF] placeholder-[#5C6B61] focus:outline-none transition-colors text-right disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || isUnnamedSecret}
                className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-[#0B0D0C] font-black transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
