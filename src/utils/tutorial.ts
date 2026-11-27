export const TUTORIAL_SEEN_KEY = 'laa3eeb_tutorial_seen_v1';

export interface TutorialStep {
  emoji: string;
  title: string;
  body: string;
  tip?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    emoji: '⚽',
    title: 'لعبة تخمين كورة على نفس الموبايل',
    body: 'بتتلعب مع أصحابك في نفس المكان: مفيش أونلاين ومفيش شات. واحد بس هو اللي شايف الإجابة، والباقيين بيسألوا ويخمنوا بالكلام بينكم.',
    tip: 'من 2 لـ 8 لاعبين على نفس الجهاز.',
  },
  {
    emoji: '🤫',
    title: 'صاحب الجولة يختار اللاعب',
    body: 'أول واحد بيبقى «صاحب الجولة». يكتب اسم اللاعب في البحث، أو يفتح باكدج جاهز (أساطير الكورة، الدوري الإنجليزي، الدوري الإسباني، نجوم مصر والعرب) ويختار في سر. ملف اللاعب بيفضل معاه هو بس.',
    tip: 'بعد كل جولة الدور بيلف على اللاعب اللي بعده.',
  },
  {
    emoji: '📱',
    title: 'سلّم الموبايل واسألوا',
    body: 'صاحب الجولة بيسلم الموبايل للباقيين. اسألوه أسئلة زي: أوروبي؟ مهاجم؟ بيلعب في إنجلترا؟ لعب في كأس العالم؟ وهو بيرد عليكم بصوته.',
    tip: 'كل سؤال بتسألوه بيقلل نقاط التخمينة الصح، فخليك ذكي.',
  },
  {
    emoji: '🎯',
    title: 'خمّنوا واجمعوا نقاط',
    body: 'كل مخمّن عنده عدد تخمينات محدود، والتخمينة الغلط بتنقص واحد. في تلميح مجاني لكل مخمّن في الجولة، وتخمينة إضافية بـ 3 نقاط من رصيدك لو احتجت.',
    tip: 'التخمينة الصح = 10 نقاط + بونص لو سألت أسئلة قليلة.',
  },
  {
    emoji: '🔥',
    title: 'تحدي اليوم وشارك نتيجتك',
    body: 'كل يوم لاعب جديد في تحدي اليوم، لو خمّنته صح تقدر تشارك نتيجتك كصورة مع أصحابك من غير ما تحرق الإجابة. ولو عايز ترجع للشرح ده تاني، اضغط «كيف تلعب؟» في الرئيسية.',
    tip: 'تحدي اليوم بيتجدد كل يوم الساعة 12 بالليل.',
  },
];

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage) return storage;
  if (storage === null) return null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    return null;
  }
  return null;
}

/** True once the user has finished or skipped the tutorial on this device. */
export function hasSeenTutorial(storage?: Storage | null): boolean {
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    return store.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** Marks the tutorial as seen; safe when storage is unavailable. */
export function markTutorialSeen(storage?: Storage | null): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch {
    // Storage disabled or full: the tutorial simply shows again next visit.
  }
}

/** Clears the flag so the tutorial opens on the next visit. */
export function resetTutorialSeen(storage?: Storage | null): void {
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    store.removeItem(TUTORIAL_SEEN_KEY);
  } catch {
    // ignore
  }
}
