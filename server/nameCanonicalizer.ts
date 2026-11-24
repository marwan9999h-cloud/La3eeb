/**
 * Generic, player-agnostic Arabic/English name canonicalization,
 * transliteration variant generation, and query context extraction.
 */

export function normalizeBasicText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىئ]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/[پ]/g, 'ب')
    .replace(/[چ]/g, 'ج')
    .replace(/[ڤ]/g, 'ف')
    .replace(/[گک]/g, 'ك')
    .replace(/ی/g, 'ي')
    .replace(/[\u064B-\u065F\u0640]/g, '')
    .replace(/['’`\-_.,;!?()/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripDefiniteAl(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (w.startsWith('ال') && w.length > 3) return w.slice(2);
      return w;
    })
    .join(' ');
}

export function fuseCompoundGivenNames(normText: string): string {
  return normText
    .replace(/(^|\s)عبد\s+(الله|الرحمن|العزيز|الكريم|القادر|الحميد|الوهاب|المجيد|اللطيف|الرؤوف|ربه)(?=\s|$)/g, '$1عبد$2')
    .replace(/(^|\s)ابو\s+(تريكه|تريكة|جبل|المعاطي|الفتوح|زيد)(?=\s|$)/g, '$1ابو$2')
    .replace(/(^|\s)بن\s+(شرقي|رمضان|عطيه|يوسف|زيمة|زيمه)(?=\s|$)/g, '$1بن$2')
    .replace(/(^|\s)abd\s*(?:al|el)\s+([a-z]+)(?=\s|$)/g, '$1abdel$2')
    .replace(/(^|\s)abdel\s+([a-z]+)(?=\s|$)/g, '$1abdel$2')
    .replace(/(^|\s)abdul\s+([a-z]+)(?=\s|$)/g, '$1abdul$2')
    .replace(/(^|\s)(?:al|el)\s+([a-z]+)(?=\s|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toGenericPhoneticKey(token: string): string {
  const clean = normalizeBasicText(token).replace(/\s+/g, '');
  if (!clean) return '';

  const isArabic = /[\u0600-\u06FF]/.test(clean);
  if (isArabic) {
    let out = '';
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (i === 0 && (ch === 'ا' || ch === 'ع')) {
        out += 'a';
        continue;
      }
      if (i === 0 && ch === 'و') {
        out += 'w';
        continue;
      }
      if (i === 0 && ch === 'ي') {
        out += 'y';
        continue;
      }
      switch (ch) {
        case 'ا':
        case 'ع':
        case 'و':
        case 'ي':
          break;
        case 'ب':
          out += 'b';
          break;
        case 'ت':
        case 'ط':
          out += 't';
          break;
        case 'ث':
        case 'س':
        case 'ص':
          out += 's';
          break;
        case 'ج':
          out += 'g';
          break;
        case 'ح':
        case 'ه':
          out += 'h';
          break;
        case 'خ':
          out += 'K';
          break;
        case 'د':
        case 'ض':
          out += 'd';
          break;
        case 'ذ':
        case 'ز':
        case 'ظ':
          out += 'z';
          break;
        case 'ر':
          out += 'r';
          break;
        case 'ش':
          out += 'S';
          break;
        case 'غ':
          out += 'G';
          break;
        case 'ف':
          out += 'f';
          break;
        case 'ق':
        case 'ك':
          out += 'k';
          break;
        case 'ل':
          out += 'l';
          break;
        case 'م':
          out += 'm';
          break;
        case 'ن':
          out += 'n';
          break;
        default:
          break;
      }
    }
    return out.replace(/(.)\1+/g, '$1');
  }

  let latin = clean.toLowerCase();
  const hasLeadingVowel = /^[aeiou]/.test(latin);
  latin = latin
    .replace(/^abd(?:el|al|ul)/, 'abd')
    .replace(/ph/g, 'f')
    .replace(/sh|ch/g, 'S')
    .replace(/kh/g, 'K')
    .replace(/gh/g, 'G')
    .replace(/th/g, 't')
    .replace(/dh/g, 'z')
    .replace(/ou/g, 'u')
    .replace(/ee|ie|ei/g, 'i')
    .replace(/c(?=[ei])/g, 's')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/j/g, 'g')
    .replace(/p/g, 'b')
    .replace(/v/g, 'f');

  let out = hasLeadingVowel ? 'a' : '';
  for (let i = 0; i < latin.length; i++) {
    const ch = latin[i];
    if (i === 0 && (ch === 'w' || ch === 'y')) {
      out += ch;
      continue;
    }
    if ('aeiouwy'.includes(ch)) continue;
    if (/[a-zA-Z]/.test(ch)) {
      out += ch;
    }
  }
  return out.replace(/(.)\1+/g, '$1');
}

interface CanonicalTokenGroup {
  key: string;
  ar: string;
  en: string[];
  aliases: string[];
}

const CANONICAL_TOKEN_GROUPS: CanonicalTokenGroup[] = [
  { key: 'mohamed', ar: 'محمد', en: ['Mohamed', 'Mohammed', 'Muhammad'], aliases: ['محمد', 'mohamed', 'mohammed', 'muhammad', 'mohamad', 'muhamed', 'mo'] },
  { key: 'mahmoud', ar: 'محمود', en: ['Mahmoud', 'Mahmood', 'Mahmud'], aliases: ['محمود', 'mahmoud', 'mahmood', 'mahmud'] },
  { key: 'ahmed', ar: 'أحمد', en: ['Ahmed', 'Ahmad'], aliases: ['احمد', 'ahmed', 'ahmad'] },
  { key: 'mostafa', ar: 'مصطفى', en: ['Mostafa', 'Mustafa'], aliases: ['مصطفي', 'mostafa', 'mustafa', 'moustafa'] },
  { key: 'ibrahim', ar: 'إبراهيم', en: ['Ibrahim', 'Ebrahim'], aliases: ['ابراهيم', 'ibrahim', 'ebrahim'] },
  { key: 'hassan', ar: 'حسن', en: ['Hassan', 'Hasan'], aliases: ['حسن', 'hassan', 'hasan'] },
  { key: 'hussein', ar: 'حسين', en: ['Hussein', 'Hussain', 'Hossein'], aliases: ['حسين', 'hussein', 'hussain', 'hossein'] },
  { key: 'ali', ar: 'علي', en: ['Ali', 'Aly'], aliases: ['علي', 'ali', 'aly'] },
  { key: 'omar', ar: 'عمر', en: ['Omar', 'Omer'], aliases: ['عمر', 'omar', 'omer'] },
  { key: 'amr', ar: 'عمرو', en: ['Amr', 'Amro'], aliases: ['عمرو', 'amr', 'amro'] },
  { key: 'khaled', ar: 'خالد', en: ['Khaled', 'Khalid'], aliases: ['خالد', 'khaled', 'khalid'] },
  { key: 'tarek', ar: 'طارق', en: ['Tarek', 'Tareq', 'Tariq'], aliases: ['طارق', 'tarek', 'tareq', 'tariq'] },
  { key: 'youssef', ar: 'يوسف', en: ['Youssef', 'Yusuf', 'Yousef'], aliases: ['يوسف', 'youssef', 'yusuf', 'yousef'] },
  { key: 'karim', ar: 'كريم', en: ['Karim', 'Kareem'], aliases: ['كريم', 'karim', 'kareem'] },
  { key: 'hossam', ar: 'حسام', en: ['Hossam', 'Hussam'], aliases: ['حسام', 'hossam', 'hussam'] },
  { key: 'walid', ar: 'وليد', en: ['Walid', 'Waleed'], aliases: ['وليد', 'walid', 'waleed'] },
  { key: 'yasser', ar: 'ياسر', en: ['Yasser', 'Yaser'], aliases: ['ياسر', 'yasser', 'yaser'] },
  { key: 'osama', ar: 'أسامة', en: ['Osama', 'Usama'], aliases: ['اسامه', 'osama', 'usama'] },
  { key: 'hesham', ar: 'هشام', en: ['Hesham', 'Hisham'], aliases: ['هشام', 'hesham', 'hisham'] },
  { key: 'ayman', ar: 'أيمن', en: ['Ayman', 'Aiman'], aliases: ['ايمن', 'ayman', 'aiman'] },
  { key: 'rami', ar: 'رامي', en: ['Rami', 'Ramy'], aliases: ['رامي', 'rami', 'ramy'] },
  { key: 'hany', ar: 'هاني', en: ['Hany', 'Hani'], aliases: ['هاني', 'hany', 'hani'] },
  { key: 'tamer', ar: 'تامر', en: ['Tamer'], aliases: ['تامر', 'tamer'] },
  { key: 'islam', ar: 'إسلام', en: ['Islam', 'Eslam'], aliases: ['اسلام', 'islam', 'eslam'] },
  { key: 'saeed', ar: 'سعيد', en: ['Saeed', 'Said'], aliases: ['سعيد', 'saeed', 'said'] },
  { key: 'saad', ar: 'سعد', en: ['Saad'], aliases: ['سعد', 'saad'] },
  { key: 'adel', ar: 'عادل', en: ['Adel', 'Adil'], aliases: ['عادل', 'adel', 'adil'] },
  { key: 'nasser', ar: 'ناصر', en: ['Nasser', 'Naser'], aliases: ['ناصر', 'nasser', 'naser'] },
  { key: 'salem', ar: 'سالم', en: ['Salem', 'Salim'], aliases: ['سالم', 'salem', 'salim'] },
  { key: 'salman', ar: 'سلمان', en: ['Salman'], aliases: ['سلمان', 'salman'] },
  { key: 'fahad', ar: 'فهد', en: ['Fahad', 'Fahd'], aliases: ['فهد', 'fahad', 'fahd'] },
  { key: 'ziad', ar: 'زياد', en: ['Ziad', 'Zeyad'], aliases: ['زياد', 'ziad', 'zeyad'] },
  { key: 'marwan', ar: 'مروان', en: ['Marwan'], aliases: ['مروان', 'marwan'] },
  { key: 'akram', ar: 'أكرم', en: ['Akram'], aliases: ['اكرم', 'akram'] },
  { key: 'bassem', ar: 'باسم', en: ['Bassem', 'Basem'], aliases: ['باسم', 'bassem', 'basem'] },
  { key: 'ashraf', ar: 'أشرف', en: ['Ashraf', 'Achraf'], aliases: ['اشرف', 'ashraf', 'achraf'] },
  { key: 'hamdy', ar: 'حمدي', en: ['Hamdy', 'Hamdi'], aliases: ['حمدي', 'hamdy', 'hamdi'] },
  { key: 'sherif', ar: 'شريف', en: ['Sherif', 'Sherief', 'Shareef', 'Sharif'], aliases: ['شريف', 'الشريف', 'sherif', 'sherief', 'shareef', 'sharif', 'alsharif', 'elsharif'] },
  { key: 'salah', ar: 'صلاح', en: ['Salah'], aliases: ['صلاح', 'salah'] },
  { key: 'fathi', ar: 'فتحي', en: ['Fathi', 'Fathy'], aliases: ['فتحي', 'fathi', 'fathy', 'fathey'] },
  { key: 'saber', ar: 'صابر', en: ['Saber', 'Sabir'], aliases: ['صابر', 'saber', 'sabir'] },
  { key: 'shenawy', ar: 'الشناوي', en: ['El Shenawy', 'Al-Shenawy', 'Shenawy'], aliases: ['الشناوي', 'شناوي', 'shenawy', 'elshenawy', 'alshenawy', 'shenawi'] },
  { key: 'shahat', ar: 'الشحات', en: ['El Shahat', 'Al-Shahat', 'Shahat'], aliases: ['الشحات', 'شحات', 'shahat', 'elshahat', 'alshahat'] },
  { key: 'ashour', ar: 'عاشور', en: ['Ashour', 'Ashur'], aliases: ['عاشور', 'ashour', 'ashur'] },
  { key: 'emam', ar: 'إمام', en: ['Emam', 'Imam'], aliases: ['امام', 'emam', 'imam'] },
  { key: 'attia', ar: 'عطية', en: ['Attia', 'Ateya'], aliases: ['عطيه', 'attia', 'ateya'] },
  { key: 'ziko', ar: 'زيكو', en: ['Ziko', 'Zico'], aliases: ['زيكو', 'ziko', 'zico'] },
  { key: 'kouka', ar: 'كوكا', en: ['Kouka', 'Koka'], aliases: ['كوكا', 'kouka', 'koka'] },
  { key: 'trezeguet', ar: 'تريزيجيه', en: ['Trezeguet'], aliases: ['تريزيجيه', 'trezeguet', 'trezeguet'] },
  { key: 'marmoush', ar: 'مرموش', en: ['Marmoush'], aliases: ['مرموش', 'marmoush'] },
  { key: 'zidan', ar: 'زيدان', en: ['Zidan', 'Zidane'], aliases: ['زيدان', 'zidan', 'zidane'] },
  { key: 'gomaa', ar: 'جمعة', en: ['Gomaa', 'Jumaa'], aliases: ['جمعه', 'gomaa', 'jumaa'] },
  { key: 'barakat', ar: 'بركات', en: ['Barakat'], aliases: ['بركات', 'barakat'] },
  { key: 'meteb', ar: 'متعب', en: ['Meteb', 'Moteab'], aliases: ['متعب', 'meteb', 'moteab'] },
  { key: 'hadary', ar: 'الحضري', en: ['El Hadary', 'El-Hadary', 'Hadary'], aliases: ['الحضري', 'حضري', 'hadary', 'elhadary', 'alhadary'] },
  { key: 'abdelkader', ar: 'عبد القادر', en: ['Abdelkader', 'Abdel Kader', 'Abdulqader'], aliases: ['عبدالقادر', 'abdelkader', 'abdulqader', 'abdelqader'] },
  { key: 'abdullah', ar: 'عبد الله', en: ['Abdullah', 'Abdallah'], aliases: ['عبدالله', 'abdullah', 'abdallah'] },
  { key: 'abdelrahman', ar: 'عبد الرحمن', en: ['Abdelrahman', 'Abdulrahman'], aliases: ['عبدالرحمن', 'abdelrahman', 'abdulrahman'] },
  { key: 'abdelaziz', ar: 'عبد العزيز', en: ['Abdelaziz', 'Abdulaziz'], aliases: ['عبدالعزيز', 'abdelaziz', 'abdulaziz'] },
  { key: 'abotrika', ar: 'أبو تريكة', en: ['Aboutrika', 'Abu Trika', 'Abou Treika'], aliases: ['ابوتريكه', 'aboutrika', 'abutrika', 'aboutreika'] },
  { key: 'bencharki', ar: 'بن شرقي', en: ['Bencharki', 'Bencherki'], aliases: ['بنشرقي', 'bencharki', 'bencherki'] },
  { key: 'ziyech', ar: 'زياش', en: ['Ziyech', 'Ziyach'], aliases: ['زياش', 'ziyech', 'ziyach'] },
  { key: 'hakimi', ar: 'حكيمي', en: ['Hakimi'], aliases: ['حكيمي', 'hakimi'] },
  { key: 'mahrez', ar: 'محرز', en: ['Mahrez'], aliases: ['محرز', 'mahrez'] },
  { key: 'bounou', ar: 'بونو', en: ['Bounou', 'Bono'], aliases: ['بونو', 'bounou', 'bono'] },
  { key: 'messi', ar: 'ميسي', en: ['Messi'], aliases: ['ميسي', 'messi'] },
  { key: 'ronaldo', ar: 'رونالدو', en: ['Ronaldo'], aliases: ['رونالدو', 'ronaldo'] },
  { key: 'cristiano', ar: 'كريستيانو', en: ['Cristiano'], aliases: ['كريستيانو', 'cristiano'] },
  { key: 'neymar', ar: 'نيمار', en: ['Neymar'], aliases: ['نيمار', 'neymar'] },
  { key: 'silva', ar: 'سيلفا', en: ['Silva'], aliases: ['سيلفا', 'silva'] },
  { key: 'bernardo', ar: 'برناردو', en: ['Bernardo'], aliases: ['برناردو', 'bernardo'] },
  { key: 'thiago', ar: 'تياجو', en: ['Thiago', 'Tiago'], aliases: ['تياجو', 'تياغو', 'thiago', 'tiago'] },
  { key: 'martinez', ar: 'مارتينيز', en: ['Martinez'], aliases: ['مارتينيز', 'martinez'] },
  { key: 'mbappe', ar: 'مبابي', en: ['Mbappe'], aliases: ['مبابي', 'امبابي', 'mbappe'] },
  { key: 'benzema', ar: 'بنزيما', en: ['Benzema'], aliases: ['بنزيما', 'بنزيمة', 'benzema'] },
  { key: 'haaland', ar: 'هالاند', en: ['Haaland'], aliases: ['هالاند', 'haaland'] },
  { key: 'modric', ar: 'مودريتش', en: ['Modric'], aliases: ['مودريتش', 'modric'] },
  { key: 'torres', ar: 'توريس', en: ['Torres'], aliases: ['توريس', 'torres'] },
  { key: 'suarez', ar: 'سواريز', en: ['Suarez'], aliases: ['سواريز', 'suarez'] },
  { key: 'dembele', ar: 'ديمبيلي', en: ['Dembele'], aliases: ['ديمبيلي', 'ديمبلي', 'dembele'] },
  { key: 'mendy', ar: 'ميندي', en: ['Mendy'], aliases: ['ميندي', 'mendy'] },
  { key: 'al_dosari', ar: 'الدوسري', en: ['Al-Dawsari', 'Al-Dosari'], aliases: ['الدوسري', 'دوسري', 'aldawsari', 'aldosari', 'dawsari', 'dosari'] },
];

const ALIAS_TO_GROUP = new Map<string, CanonicalTokenGroup>();
for (const group of CANONICAL_TOKEN_GROUPS) {
  for (const alias of group.aliases) {
    const norm = normalizeBasicText(alias).replace(/\s+/g, '');
    if (norm) ALIAS_TO_GROUP.set(norm, group);
    const stripped = stripDefiniteAl(normalizeBasicText(alias)).replace(/\s+/g, '');
    if (stripped) ALIAS_TO_GROUP.set(stripped, group);
  }
}

export function lookupCanonicalGroup(token: string): CanonicalTokenGroup | undefined {
  const norm = normalizeBasicText(token).replace(/\s+/g, '');
  if (!norm) return undefined;
  const direct = ALIAS_TO_GROUP.get(norm);
  if (direct) return direct;
  const stripped = stripDefiniteAl(normalizeBasicText(token)).replace(/\s+/g, '');
  return ALIAS_TO_GROUP.get(stripped);
}

export function canonicalTokenKey(token: string): string {
  const group = lookupCanonicalGroup(token);
  if (group) return group.key;
  const stripped = stripDefiniteAl(normalizeBasicText(token));
  return toGenericPhoneticKey(stripped || token);
}

function transliterateArabicTokenToLatin(token: string): string {
  const clean = normalizeBasicText(token);
  if (!clean) return '';

  let rest = clean;
  let prefix = '';
  if (rest.startsWith('ال') && rest.length > 3) {
    prefix = 'El-';
    rest = rest.slice(2);
  }

  const charMap: Record<string, string> = {
    ا: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'g', ح: 'h', خ: 'kh',
    د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's',
    ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'k',
    ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'o', ي: 'i',
  };

  let out = '';
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i];
    if (i === 0 && ch === 'ي') {
      out += 'y';
      continue;
    }
    if (i === 0 && ch === 'و') {
      out += 'w';
      continue;
    }
    out += charMap[ch] || '';
  }

  if (!out) return '';
  const capitalized = out.charAt(0).toUpperCase() + out.slice(1);
  return `${prefix}${capitalized}`;
}

// Generic context phrases (clubs, countries/nationalities, leagues, and generic football qualifiers)
const MULTIWORD_CONTEXT_PHRASES: Array<{ phrase: string; expansions: string[] }> = [
  { phrase: 'ريال مدريد', expansions: ['ريال مدريد', 'real madrid', 'madrid'] },
  { phrase: 'real madrid', expansions: ['ريال مدريد', 'real madrid', 'madrid'] },
  { phrase: 'مانشستر يونايتد', expansions: ['مانشستر يونايتد', 'manchester united', 'man united'] },
  { phrase: 'manchester united', expansions: ['مانشستر يونايتد', 'manchester united'] },
  { phrase: 'مانشستر سيتي', expansions: ['مانشستر سيتي', 'manchester city', 'man city'] },
  { phrase: 'manchester city', expansions: ['مانشستر سيتي', 'manchester city'] },
  { phrase: 'استون فيلا', expansions: ['استون فيلا', 'أستون فيلا', 'aston villa'] },
  { phrase: 'aston villa', expansions: ['استون فيلا', 'أستون فيلا', 'aston villa'] },
  { phrase: 'اتلتيكو مدريد', expansions: ['اتلتيكو مدريد', 'أتلتيكو مدريد', 'atletico madrid'] },
  { phrase: 'atletico madrid', expansions: ['اتلتيكو مدريد', 'atletico madrid'] },
  { phrase: 'بايرن ميونخ', expansions: ['بايرن ميونخ', 'bayern munich', 'bayern'] },
  { phrase: 'bayern munich', expansions: ['بايرن ميونخ', 'bayern munich', 'bayern'] },
  { phrase: 'باريس سان جيرمان', expansions: ['باريس سان جيرمان', 'paris saint germain', 'psg'] },
  { phrase: 'paris saint germain', expansions: ['باريس سان جيرمان', 'paris saint germain', 'psg'] },
  { phrase: 'انتر ميلان', expansions: ['انتر ميلان', 'إنتر ميلان', 'inter milan', 'inter'] },
  { phrase: 'inter milan', expansions: ['انتر ميلان', 'inter milan', 'inter'] },
  { phrase: 'اع ميلان', expansions: ['ميلان', 'ac milan', 'milan'] },
  { phrase: 'ac milan', expansions: ['ميلان', 'ac milan', 'milan'] },
  { phrase: 'المقاولون العرب', expansions: ['المقاولون العرب', 'arab contractors'] },
  { phrase: 'طلائع الجيش', expansions: ['طلائع الجيش', 'el gaish'] },
  { phrase: 'غزل المحله', expansions: ['غزل المحلة', 'ghazl el mahalla'] },
  { phrase: 'الاتحاد السكندري', expansions: ['الاتحاد السكندري', 'al ittihad alexandria'] },
  { phrase: 'الدوري المصري', expansions: ['الدوري المصري', 'egyptian premier league'] },
  { phrase: 'الدوري الانجليزي', expansions: ['الدوري الإنجليزي', 'premier league'] },
  { phrase: 'الدوري السعودي', expansions: ['الدوري السعودي', 'saudi pro league'] },
  { phrase: 'الدوري الاسباني', expansions: ['الدوري الإسباني', 'la liga'] },
  { phrase: 'premier league', expansions: ['premier league', 'البريميرليج', 'الدوري الإنجليزي'] },
  { phrase: 'la liga', expansions: ['la liga', 'الدوري الإسباني'] },
  { phrase: 'serie a', expansions: ['serie a', 'الدوري الإيطالي'] },
  { phrase: 'bundesliga', expansions: ['bundesliga', 'الدوري الألماني'] },
  { phrase: 'ligue 1', expansions: ['ligue 1', 'الدوري الفرنسي'] },
  { phrase: 'saudi arabia', expansions: ['السعودية', 'سعودي', 'saudi'] },
  { phrase: 'al ahly', expansions: ['الاهلي', 'الأهلي', 'al ahly', 'ahly'] },
  { phrase: 'al ahli', expansions: ['الاهلي', 'الأهلي', 'al ahli', 'ahli'] },
  { phrase: 'al zamalek', expansions: ['الزمالك', 'zamalek'] },
  { phrase: 'al hilal', expansions: ['الهلال', 'al hilal', 'hilal'] },
  { phrase: 'al nassr', expansions: ['النصر', 'al nassr', 'nassr'] },
  { phrase: 'al ittihad', expansions: ['الاتحاد', 'al ittihad', 'ittihad'] },
  { phrase: 'al zawraa', expansions: ['الزوراء', 'al zawraa', 'zawraa'] },
  { phrase: 'al arabi', expansions: ['العربي', 'al arabi', 'arabi'] },
];

const SINGLE_CONTEXT_WORDS: Record<string, string[]> = {
  // Egyptian & Arab clubs
  الزمالك: ['الزمالك', 'zamalek'],
  زمالك: ['الزمالك', 'zamalek'],
  zamalek: ['الزمالك', 'zamalek'],
  الاهلي: ['الأهلي', 'الاهلي', 'al ahly', 'ahly', 'ahli'],
  اهلي: ['الأهلي', 'الاهلي', 'al ahly', 'ahly', 'ahli'],
  ahly: ['الأهلي', 'الاهلي', 'al ahly', 'ahly'],
  ahli: ['الأهلي', 'الاهلي', 'al ahli', 'ahli'],
  بيراميدز: ['بيراميدز', 'pyramids'],
  pyramids: ['بيراميدز', 'pyramids'],
  الاسماعيلي: ['الإسماعيلي', 'الاسماعيلي', 'ismaily'],
  ismaily: ['الإسماعيلي', 'ismaily'],
  انبي: ['إنبي', 'انبي', 'enppi'],
  enppi: ['إنبي', 'enppi'],
  سموحه: ['سموحة', 'smouha'],
  smouha: ['سموحة', 'smouha'],
  فيوتشر: ['فيوتشر', 'future'],
  الهلال: ['الهلال', 'al hilal', 'hilal'],
  hilal: ['الهلال', 'al hilal', 'hilal'],
  النصر: ['النصر', 'al nassr', 'nassr'],
  nassr: ['النصر', 'al nassr', 'nassr'],
  الاتحاد: ['الاتحاد', 'al ittihad', 'ittihad'],
  ittihad: ['الاتحاد', 'al ittihad', 'ittihad'],
  الشباب: ['الشباب', 'al shabab', 'shabab'],
  shabab: ['الشباب', 'al shabab', 'shabab'],
  الزوراء: ['الزوراء', 'al zawraa', 'zawraa'],
  zawraa: ['الزوراء', 'al zawraa', 'zawraa'],
  الخليج: ['الخليج', 'al khaleej', 'khaleej'],
  khaleej: ['الخليج', 'al khaleej', 'khaleej'],
  الوداد: ['الوداد', 'wydad'],
  wydad: ['الوداد', 'wydad'],
  الرجاء: ['الرجاء', 'raja'],
  raja: ['الرجاء', 'raja'],
  الترجي: ['الترجي', 'esperance'],
  // International clubs
  ليفربول: ['ليفربول', 'liverpool'],
  liverpool: ['ليفربول', 'liverpool'],
  برشلونه: ['برشلونة', 'barcelona', 'barca'],
  barcelona: ['برشلونة', 'barcelona'],
  ارسنال: ['أرسنال', 'ارسنال', 'arsenal'],
  arsenal: ['أرسنال', 'arsenal'],
  تشيلسي: ['تشيلسي', 'chelsea'],
  chelsea: ['تشيلسي', 'chelsea'],
  توتنهام: ['توتنهام', 'tottenham'],
  tottenham: ['توتنهام', 'tottenham'],
  يوفنتوس: ['يوفنتوس', 'juventus'],
  juventus: ['يوفنتوس', 'juventus'],
  نابولي: ['نابولي', 'napoli'],
  napoli: ['نابولي', 'napoli'],
  روما: ['روما', 'roma'],
  roma: ['روما', 'roma'],
  دورتموند: ['دورتموند', 'dortmund'],
  dortmund: ['دورتموند', 'dortmund'],
  بايرن: ['بايرن', 'bayern'],
  bayern: ['بايرن', 'bayern'],
  بنفيكا: ['بنفيكا', 'benfica'],
  benfica: ['بنفيكا', 'benfica'],
  بورتو: ['بورتو', 'porto'],
  porto: ['بورتو', 'porto'],
  اياكس: ['أياكس', 'ajax'],
  ajax: ['أياكس', 'ajax'],
  مارسيليا: ['مارسيليا', 'marseille'],
  marseille: ['مارسيليا', 'marseille'],
  موناكو: ['موناكو', 'monaco'],
  monaco: ['موناكو', 'monaco'],
  لوهافر: ['لوهافر', 'le havre', 'havre'],
  // Countries / Nationalities
  مصر: ['مصر', 'مصري', 'egypt', 'egyptian'],
  مصري: ['مصر', 'مصري', 'egypt', 'egyptian'],
  egypt: ['مصر', 'مصري', 'egypt', 'egyptian'],
  egyptian: ['مصر', 'مصري', 'egypt', 'egyptian'],
  السعوديه: ['السعودية', 'سعودي', 'saudi'],
  سعودي: ['السعودية', 'سعودي', 'saudi'],
  saudi: ['السعودية', 'سعودي', 'saudi'],
  المغرب: ['المغرب', 'مغربي', 'morocco', 'moroccan'],
  مغربي: ['المغرب', 'مغربي', 'morocco', 'moroccan'],
  morocco: ['المغرب', 'مغربي', 'morocco', 'moroccan'],
  moroccan: ['المغرب', 'مغربي', 'morocco', 'moroccan'],
  الجزائر: ['الجزائر', 'جزائري', 'algeria', 'algerian'],
  جزائري: ['الجزائر', 'جزائري', 'algeria', 'algerian'],
  algeria: ['الجزائر', 'جزائري', 'algeria', 'algerian'],
  algerian: ['الجزائر', 'جزائري', 'algeria', 'algerian'],
  تونس: ['تونس', 'تونسي', 'tunisia', 'tunisian'],
  تونسي: ['تونس', 'تونسي', 'tunisia', 'tunisian'],
  tunisia: ['تونس', 'تونسي', 'tunisia', 'tunisian'],
  قطر: ['قطر', 'قطري', 'qatar', 'qatari'],
  قطري: ['قطر', 'قطري', 'qatar', 'qatari'],
  qatar: ['قطر', 'قطري', 'qatar', 'qatari'],
  qatari: ['قطر', 'قطري', 'qatar', 'qatari'],
  العراق: ['العراق', 'عراقي', 'iraq', 'iraqi'],
  عراقي: ['العراق', 'عراقي', 'iraq', 'iraqi'],
  iraq: ['العراق', 'عراقي', 'iraq', 'iraqi'],
  iraqi: ['العراق', 'عراقي', 'iraq', 'iraqi'],
  السودان: ['السودان', 'سوداني', 'sudan', 'sudanese'],
  sudan: ['السودان', 'سوداني', 'sudan', 'sudanese'],
  الامارات: ['الإمارات', 'إماراتي', 'uae', 'emirati'],
  انجلترا: ['إنجلترا', 'إنجليزي', 'england', 'english'],
  england: ['إنجلترا', 'إنجليزي', 'england', 'english'],
  اسبانيا: ['إسبانيا', 'إسباني', 'spain', 'spanish'],
  spain: ['إسبانيا', 'إسباني', 'spain', 'spanish'],
  فرنسا: ['فرنسا', 'فرنسي', 'france', 'french'],
  france: ['فرنسا', 'فرنسي', 'france', 'french'],
  المانيا: ['ألمانيا', 'ألماني', 'germany', 'german'],
  germany: ['ألمانيا', 'ألماني', 'germany', 'german'],
  ايطاليا: ['إيطاليا', 'إيطالي', 'italy', 'italian'],
  italy: ['إيطاليا', 'إيطالي', 'italy', 'italian'],
  البرازيل: ['البرازيل', 'برازيلي', 'brazil', 'brazilian'],
  brazil: ['البرازيل', 'برازيلي', 'brazil', 'brazilian'],
  الارجنتين: ['الأرجنتين', 'أرجنتيني', 'argentina', 'argentine'],
  argentina: ['الأرجنتين', 'أرجنتيني', 'argentina', 'argentine'],
  البرتغال: ['البرتغال', 'برتغالي', 'portugal', 'portuguese'],
  portugal: ['البرتغال', 'برتغالي', 'portugal', 'portuguese'],
  // Generic football words / roles
  نادي: [],
  منتخب: [],
  لاعب: [],
  حارس: ['حارس مرمى', 'goalkeeper'],
  المرمي: [],
  معتزل: ['معتزل', 'retired'],
  retired: ['معتزل', 'retired'],
  fc: [],
  sc: [],
  club: [],
};

export interface QueryContextExtraction {
  rawQuery: string;
  nameQuery: string;
  contextExpansions: string[];
  hadContext: boolean;
}

export function extractQueryContext(rawQuery: string): QueryContextExtraction {
  const clean = String(rawQuery || '').trim();
  if (!clean) {
    return { rawQuery: '', nameQuery: '', contextExpansions: [], hadContext: false };
  }

  let working = normalizeBasicText(clean);
  const matchedExpansions = new Set<string>();
  let hadContext = false;

  for (const item of MULTIWORD_CONTEXT_PHRASES) {
    const escaped = item.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)${escaped}(?=\\s|$)`, 'g');
    if (regex.test(working)) {
      hadContext = true;
      for (const exp of item.expansions) matchedExpansions.add(exp);
      working = working.replace(regex, ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const remainingTokens = working.split(/\s+/).filter(Boolean);
  const keptNameTokens: string[] = [];

  for (const tok of remainingTokens) {
    const ctx = SINGLE_CONTEXT_WORDS[tok];
    if (ctx !== undefined) {
      hadContext = true;
      for (const exp of ctx) matchedExpansions.add(exp);
      continue;
    }
    keptNameTokens.push(tok);
  }

  const nameQuery = keptNameTokens.join(' ').trim();
  return {
    rawQuery: clean,
    nameQuery,
    contextExpansions: Array.from(matchedExpansions),
    hadContext,
  };
}

export interface CanonicalQueryInfo {
  rawQuery: string;
  nameQuery: string;
  contextExpansions: string[];
  hadContext: boolean;
  canonicalKey: string;
  tokenKeys: string[];
  arSearchQueries: string[];
  enSearchQueries: string[];
  allMatchNames: string[];
}

export function buildEnglishTransliterationVariants(rawQuery: string, maxVariants = 6): string[] {
  const clean = String(rawQuery || '').trim();
  if (!clean) return [];

  const fused = fuseCompoundGivenNames(normalizeBasicText(clean));
  const tokens = fused.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const perToken: string[][] = tokens.map((tok) => {
    const group = lookupCanonicalGroup(tok);
    if (group && group.en.length > 0) {
      // If user typed a Latin variant, keep it first alongside the group variants
      if (/^[a-z]+$/i.test(tok)) {
        const cap = tok.charAt(0).toUpperCase() + tok.slice(1);
        return [cap, ...group.en.filter((v) => v.toLowerCase() !== tok.toLowerCase())];
      }
      return group.en;
    }
    if (/[\u0600-\u06FF]/.test(tok)) {
      const fb = transliterateArabicTokenToLatin(tok);
      return fb ? [fb] : [];
    }
    const rawCap = tok.charAt(0).toUpperCase() + tok.slice(1);
    return [rawCap];
  });

  if (perToken.some((list) => list.length === 0)) {
    return /^[a-zA-Z\s'-]+$/.test(clean) ? [clean] : [];
  }

  const combos: Array<{ text: string; cost: number }> = [];
  const build = (idx: number, acc: string[], cost: number) => {
    if (idx === perToken.length) {
      combos.push({ text: acc.join(' '), cost });
      return;
    }
    const list = perToken[idx].slice(0, 3);
    for (let i = 0; i < list.length; i++) {
      build(idx + 1, [...acc, list[i]], cost + i);
    }
  };
  build(0, [], 0);
  combos.sort((a, b) => a.cost - b.cost);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of combos) {
    const key = c.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c.text);
      if (out.length >= maxVariants) break;
    }
  }
  return out;
}

export function buildArabicSearchVariants(rawQuery: string): string[] {
  const clean = String(rawQuery || '').trim();
  if (!clean) return [];

  const hasArabic = /[\u0600-\u06FF]/.test(clean);
  if (hasArabic) {
    return [clean];
  }

  const fused = fuseCompoundGivenNames(normalizeBasicText(clean));
  const tokens = fused.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const mappedArTokens: string[] = [];
  let allMapped = true;
  for (const tok of tokens) {
    const group = lookupCanonicalGroup(tok);
    if (group && group.ar) {
      mappedArTokens.push(group.ar);
    } else {
      allMapped = false;
      break;
    }
  }

  if (allMapped && mappedArTokens.length > 0) {
    return [mappedArTokens.join(' ')];
  }

  return [];
}

export function buildCanonicalNameKey(rawName: string): { canonicalKey: string; tokenKeys: string[] } {
  const fused = fuseCompoundGivenNames(normalizeBasicText(rawName).replace(/\s*\([^)]*\)/g, ' '));
  const tokens = fused.split(/\s+/).filter(Boolean);
  const tokenKeys = tokens.map(canonicalTokenKey).filter(Boolean);
  return {
    canonicalKey: tokenKeys.join('_'),
    tokenKeys,
  };
}

export function canonicalizeQuery(rawQuery: string): CanonicalQueryInfo {
  const ctx = extractQueryContext(rawQuery);
  const namePart = ctx.nameQuery || ctx.rawQuery;
  const { canonicalKey, tokenKeys } = buildCanonicalNameKey(namePart);

  const arFromCanonical = buildArabicSearchVariants(namePart);
  const arSearchQueries = arFromCanonical.length > 0 ? arFromCanonical : [namePart];
  const enSearchQueries = buildEnglishTransliterationVariants(namePart, 6);

  const allMatchNames = Array.from(
    new Set(
      [namePart, ...arFromCanonical, ...enSearchQueries]
        .map((n) => n.trim())
        .filter(Boolean)
    )
  );

  return {
    rawQuery: ctx.rawQuery,
    nameQuery: ctx.nameQuery,
    contextExpansions: ctx.contextExpansions,
    hadContext: ctx.hadContext,
    canonicalKey,
    tokenKeys,
    arSearchQueries,
    enSearchQueries,
    allMatchNames,
  };
}

export function computeContextMatchScore(
  candidateDetails: Array<string | undefined>,
  contextExpansions: string[]
): number {
  if (!contextExpansions || contextExpansions.length === 0) return 0;
  const haystack = normalizeBasicText(candidateDetails.filter(Boolean).join(' '));
  if (!haystack) return 0;

  let hits = 0;
  for (const exp of contextExpansions) {
    const normExp = normalizeBasicText(exp);
    if (normExp && haystack.includes(normExp)) {
      hits++;
    }
  }
  return hits;
}
