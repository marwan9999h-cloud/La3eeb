import React, { useState } from 'react';
import {
  X,
  Unlock,
  Trophy,
  Activity,
} from 'lucide-react';
import { PlayerProfile } from '../types';
import { sounds } from '../utils/sound';

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  pickerName: string;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  pickerName,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#131815] border border-[#212823] rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#212823] flex items-center justify-between bg-[#171E1A]">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <div>
              <h2 className="font-black text-sm sm:text-base text-[#EEF2EF] flex items-center gap-2">
                <span>ملف اللاعب الكامل</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
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
            className="p-2 rounded-xl bg-[#131815] text-[#8FA095] hover:text-[#EEF2EF] border border-[#212823] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safeguard Screen if not unlocked */}
        {!isUnlocked ? (
          <div className="p-8 text-center my-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4">
              🔒
            </div>
            <h3 className="text-lg font-black text-[#EEF2EF] mb-1.5">
              الشاشة دي لـ {pickerName} بس!
            </h3>
            <p className="text-xs text-[#8FA095] max-w-xs mx-auto mb-6">
              تأكد إن الباقيين مش باصين على الجهاز عشان ماتكشفش اللاعب بالغلط.
            </p>
            <button
              id="btn-unlock-profile"
              onClick={() => {
                sounds.playSelect();
                setIsUnlocked(true);
              }}
              className="py-3.5 px-6 rounded-2xl bg-[#22C55E] hover:bg-[#1FA644] text-[#0B0D0C] font-black text-xs flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer shadow-lg shadow-[#22C55E]/20"
            >
              <Unlock className="w-4 h-4" />
              <span>أنا {pickerName}، اعرض ملف اللاعب</span>
            </button>
          </div>
        ) : (
          /* Profile Details Content (Full 6 Sections) */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-right">
            {profile.isCustomOrSecret && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-amber-300 text-xs text-right space-y-1">
                <div className="font-black text-sm flex items-center gap-1.5 text-amber-400">
                  <span>🤫</span>
                  <span>أنت اخترت لاعباً في سرك ({profile.displayName})</span>
                </div>
                <p className="text-amber-200/80 leading-relaxed">
                  هذا اللاعب تم اختياره بدون بحث على الإنترنت. أنت تجيب أصدقاءك بنعم أو لا اعتماداً على معرفتك به. إذا احتجت للتأكد من معلومة كروية، يمكنك الضغط على زر &quot;اسأل الـ AI&quot; في أي وقت.
                </p>
              </div>
            )}

            {/* Header Banner */}
            {(() => {
              const isUnverified =
                profile.researchMode !== 'local_db' &&
                (profile.verification === 'unverified' ||
                  (profile.researchMode === 'ai_knowledge' &&
                    (!profile.sources || profile.sources.length === 0)));

              const hasBasicInfo = Boolean(
                (profile.nationality && profile.nationality !== 'غير متاح') ||
                (profile.position && profile.position !== 'غير متاح') ||
                profile.currentClub ||
                profile.lastClub ||
                (profile.age && profile.age !== 'غير متاح') ||
                (profile.nationalTeam && profile.nationalTeam !== 'غير متاح')
              );

              return (
                <>
                  <div className="bg-[#171E1A] p-4 rounded-2xl border border-[#212823]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-black text-[#EEF2EF]">
                            {profile.displayName}
                          </h3>
                          {profile.shirtNumber && profile.shirtNumber !== 'غير متاح' && (
                            <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-[#22C55E]/20 text-[#22C55E]">
                              #{profile.shirtNumber}
                            </span>
                          )}
                          {isUnverified && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              غير مؤكد
                            </span>
                          )}
                          {profile.researchMode !== 'local_db' &&
                            !isUnverified &&
                            profile.sources &&
                            profile.sources.length > 0 &&
                            /^https?:\/\//i.test(profile.sources[0].uri) && (
                              <a
                                href={profile.sources[0].uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 hover:bg-sky-500/25 transition-colors inline-flex items-center gap-1"
                              >
                                مصدر: ويكيبيديا ↗
                              </a>
                            )}
                        </div>
                        <span className="text-xs text-[#8FA095] block mt-0.5">
                          {profile.playerName}
                        </span>
                      </div>
                      <span className="text-xs font-bold px-3 py-1 rounded-xl bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                        {profile.isRetired ? 'معتزل' : 'لاعب حالي'}
                      </span>
                    </div>
                    {!profile.isRetired && profile.researchMode !== 'unavailable' && (
                      <p className="text-[11px] text-[#5C6B61] mt-2 pt-2 border-t border-[#212823]/60">
                        النادي والأرقام ممكن تكون اتغيرت — راجعها قبل ما تحسم.
                      </p>
                    )}
                  </div>

                  {/* 1. Basic Info */}
                  {hasBasicInfo && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                        <span>📌</span> 1. المعلومات الأساسية
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823]">
                        {profile.nationality && profile.nationality !== 'غير متاح' && (
                          <div>
                            <span className="text-[#5C6B61] block mb-0.5">الجنسية</span>
                            <span className="font-bold text-[#EEF2EF]">{profile.nationality}</span>
                          </div>
                        )}
                        {profile.position && profile.position !== 'غير متاح' && (
                          <div>
                            <span className="text-[#5C6B61] block mb-0.5">المركز</span>
                            <span className="font-bold text-[#EEF2EF]">{profile.position}</span>
                          </div>
                        )}
                        {(profile.currentClub || profile.lastClub) && (
                          <div>
                            <span className="text-[#5C6B61] block mb-0.5">
                              {profile.isRetired ? 'آخر نادي' : 'النادي الحالي'}
                            </span>
                            <span className="font-bold text-[#22C55E]">
                              {profile.currentClub || profile.lastClub}
                            </span>
                          </div>
                        )}
                        {profile.age && profile.age !== 'غير متاح' && (
                          <div>
                            <span className="text-[#5C6B61] block mb-0.5">العمر / الميلاد</span>
                            <span className="font-bold text-[#EEF2EF]">{profile.age}</span>
                          </div>
                        )}
                        {profile.nationalTeam && profile.nationalTeam !== 'غير متاح' && (
                          <div className="col-span-2 sm:col-span-2">
                            <span className="text-[#5C6B61] block mb-0.5">المنتخب الوطني</span>
                            <span className="font-bold text-[#EEF2EF]">{profile.nationalTeam}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* 2. Clubs & Career */}
            {profile.clubs && profile.clubs.filter((c) => c && c !== 'غير متاح').length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-[#22C55E] uppercase tracking-wider flex items-center gap-1.5">
                  <span>🏟️</span> 2. الأندية والمسيرة
                </h4>
                <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] space-y-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {profile.clubs
                      .filter((c) => c && c !== 'غير متاح')
                      .map((c, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-xl bg-[#131815] text-[#EEF2EF] border border-[#212823] text-xs font-semibold"
                        >
                          {c}
                        </span>
                      ))}
                  </div>
                  {profile.careerTimeline && profile.careerTimeline.filter((t) => t && t !== 'غير متاح').length > 0 && (
                    <div className="pt-2 border-t border-[#212823] text-xs text-[#8FA095] space-y-1">
                      {profile.careerTimeline
                        .filter((t) => t && t !== 'غير متاح')
                        .map((tl, i) => (
                          <p key={i}>• {tl}</p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Trophies */}
            {profile.trophies && profile.trophies.filter((t) => t && t !== 'غير متاح').length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> 3. البطولات والإنجازات
                </h4>
                <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] space-y-2">
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-[#EEF2EF]">
                    {profile.trophies
                      .filter((t) => t && t !== 'غير متاح')
                      .map((trophy, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400 shrink-0">🏆</span>
                          <span>{trophy}</span>
                        </li>
                      ))}
                  </ul>
                  {profile.individualAwards && profile.individualAwards.filter((a) => a && a !== 'غير متاح').length > 0 && (
                    <div className="pt-2 border-t border-[#212823]">
                      <span className="text-amber-300 font-bold text-[11px] block mb-1">الجوائز الفردية:</span>
                      <ul className="space-y-1 text-[11px] text-[#8FA095]">
                        {profile.individualAwards
                          .filter((a) => a && a !== 'غير متاح')
                          .map((award, i) => (
                            <li key={i}>⭐ {award}</li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Statistics (No fake numbers) */}
            {Boolean(
              (profile.appearances && profile.appearances !== 'غير متاح') ||
              (profile.goals && profile.goals !== 'غير متاح') ||
              (profile.assists && profile.assists !== 'غير متاح') ||
              (profile.keyStats && profile.keyStats.filter((s) => s && s !== 'غير متاح').length > 0)
            ) && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> 4. الأرقام والإحصائيات
                </h4>
                <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] space-y-2">
                  {Boolean(
                    (profile.appearances && profile.appearances !== 'غير متاح') ||
                    (profile.goals && profile.goals !== 'غير متاح') ||
                    (profile.assists && profile.assists !== 'غير متاح')
                  ) && (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {profile.appearances && profile.appearances !== 'غير متاح' && (
                        <div className="bg-[#131815] p-2.5 rounded-xl border border-[#212823]">
                          <span className="text-[#5C6B61] text-[10px] block">المشاركات</span>
                          <span className="font-black text-xs text-[#EEF2EF]">{profile.appearances}</span>
                        </div>
                      )}
                      {profile.goals && profile.goals !== 'غير متاح' && (
                        <div className="bg-[#131815] p-2.5 rounded-xl border border-[#212823]">
                          <span className="text-[#5C6B61] text-[10px] block">الأهداف</span>
                          <span className="font-black text-xs text-[#22C55E]">{profile.goals}</span>
                        </div>
                      )}
                      {profile.assists && profile.assists !== 'غير متاح' && (
                        <div className="bg-[#131815] p-2.5 rounded-xl border border-[#212823]">
                          <span className="text-[#5C6B61] text-[10px] block">الأسيست</span>
                          <span className="font-black text-xs text-sky-400">{profile.assists}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {profile.keyStats && profile.keyStats.filter((s) => s && s !== 'غير متاح').length > 0 && (
                    <ul className="space-y-1 text-[11px] text-[#8FA095] list-disc list-inside pt-1">
                      {profile.keyStats
                        .filter((s) => s && s !== 'غير متاح')
                        .map((stat, i) => (
                          <li key={i}>{stat}</li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* 5. Additional Facts, Teammates & Managers */}
            {Boolean(
              (profile.verifiedFacts && profile.verifiedFacts.filter((f) => f && f !== 'غير متاح').length > 0) ||
              (profile.notableTeammates && profile.notableTeammates.filter((t) => t && t !== 'غير متاح').length > 0) ||
              (profile.notableManagers && profile.notableManagers.filter((m) => m && m !== 'غير متاح').length > 0) ||
              (profile.importantMatches && profile.importantMatches.filter((im) => im && im !== 'غير متاح').length > 0)
            ) && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💡</span> 5. حقائق كروية وزملاء ومدربون
                </h4>
                <div className="bg-[#171E1A]/80 p-3.5 rounded-2xl border border-[#212823] space-y-2">
                  {profile.verifiedFacts && profile.verifiedFacts.filter((f) => f && f !== 'غير متاح').length > 0 && (
                    <ul className="space-y-1 text-xs text-[#8FA095]">
                      {profile.verifiedFacts
                        .filter((f) => f && f !== 'غير متاح')
                        .map((fact, i) => (
                          <li key={i}>• {fact}</li>
                        ))}
                    </ul>
                  )}
                  {profile.notableTeammates && profile.notableTeammates.filter((t) => t && t !== 'غير متاح').length > 0 && (
                    <div className="pt-2 border-t border-[#212823] text-[11px] text-[#8FA095]">
                      <span className="text-[#5C6B61] font-bold block mb-0.5">أبرز من زاملهم:</span>
                      <span>{profile.notableTeammates.filter((t) => t && t !== 'غير متاح').join(' • ')}</span>
                    </div>
                  )}
                  {profile.notableManagers && profile.notableManagers.filter((m) => m && m !== 'غير متاح').length > 0 && (
                    <div className="pt-1 text-[11px] text-[#8FA095]">
                      <span className="text-[#5C6B61] font-bold block mb-0.5">أبرز المدربين:</span>
                      <span>{profile.notableManagers.filter((m) => m && m !== 'غير متاح').join(' • ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[#212823] bg-[#171E1A]">
          <button
            id="btn-close-profile-modal"
            onClick={() => {
              sounds.playClick();
              setIsUnlocked(false);
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-[#131815] hover:bg-[#1C2520] text-[#EEF2EF] font-bold text-xs border border-[#212823] transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
