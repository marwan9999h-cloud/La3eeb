import { normalizeSearch, stripAl } from './playerDatabase.js';

export interface IndexPlayer {
  id: string;
  name: string;
  displayName: string;
  aliases: string[];
  nationality: string;
  position: 'مهاجم' | 'جناح' | 'لاعب وسط' | 'مدافع' | 'حارس مرمى';
  isRetired: boolean;
}

export const PLAYERS_INDEX: IndexPlayer[] = [
  {
    "id": "idx-eg-1",
    "name": "Mohamed Barakat",
    "displayName": "محمد بركات",
    "aliases": [
      "بركات",
      "الزئبقي"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-2",
    "name": "Wael Gomaa",
    "displayName": "وائل جمعة",
    "aliases": [
      "جمعة",
      "الصخرة"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-3",
    "name": "Ahmed Hassan",
    "displayName": "أحمد حسن",
    "aliases": [
      "الصقر",
      "العميد"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-4",
    "name": "Hazem Emam",
    "displayName": "حازم إمام",
    "aliases": [
      "حازم امام",
      "إمام الموهوبين",
      "الثعلب الصغير"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-5",
    "name": "Hosny Abd Rabo",
    "displayName": "حسني عبد ربه",
    "aliases": [
      "عبد ربه",
      "القيصر"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-6",
    "name": "Mohamed Zidan",
    "displayName": "محمد زيدان",
    "aliases": [
      "زيزو دورتموند"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-7",
    "name": "Ahmed Elmohamady",
    "displayName": "أحمد المحمدي",
    "aliases": [
      "المحمدي",
      "elmohamady"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-8",
    "name": "Tarek El-Said",
    "displayName": "طارق السعيد",
    "aliases": [
      "السعيد"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-9",
    "name": "Sayed Moawad",
    "displayName": "سيد معوض",
    "aliases": [
      "معوض"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-10",
    "name": "Ibrahim Hassan",
    "displayName": "إبراهيم حسن",
    "aliases": [
      "ابراهيم حسن"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-11",
    "name": "Mahmoud El Khatib",
    "displayName": "محمود الخطيب",
    "aliases": [
      "بيبو",
      "الخطيب",
      "بيبو الكرة المصرية"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-12",
    "name": "Taher Abouzeid",
    "displayName": "طاهر أبو زيد",
    "aliases": [
      "مارادونا النيل",
      "طاهر ابو زيد"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-13",
    "name": "Hany Ramzy",
    "displayName": "هاني رمزي",
    "aliases": [
      "رمزي"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-14",
    "name": "Ahmed Shobair",
    "displayName": "أحمد شوبير",
    "aliases": [
      "شوبير"
    ],
    "nationality": "مصر",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-eg-15",
    "name": "Nader El-Sayed",
    "displayName": "نادر السيد",
    "aliases": [
      "نادر السيد الحارس"
    ],
    "nationality": "مصر",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-eg-16",
    "name": "Abdelwahed El-Sayed",
    "displayName": "عبد الواحد السيد",
    "aliases": [
      "وحيد"
    ],
    "nationality": "مصر",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-eg-17",
    "name": "Sherif Ekramy",
    "displayName": "شريف إكرامي",
    "aliases": [
      "شريف اكرامي",
      "اكرامي"
    ],
    "nationality": "مصر",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-eg-18",
    "name": "Ahmed Hegazi",
    "displayName": "أحمد حجازي",
    "aliases": [
      "حجازي",
      "hegazi"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-eg-19",
    "name": "Ali Gabr",
    "displayName": "علي جبر",
    "aliases": [
      "جبر"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-eg-20",
    "name": "Mohamed Abdelmonem",
    "displayName": "محمد عبد المنعم",
    "aliases": [
      "عبد المنعم",
      "كامبوس"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-eg-21",
    "name": "Mahmoud Hamdy El Wensh",
    "displayName": "محمود حمدي الونش",
    "aliases": [
      "الونش",
      "محمود الونش"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-eg-22",
    "name": "Ahmed Fatouh",
    "displayName": "أحمد فتوح",
    "aliases": [
      "فتوح"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-eg-23",
    "name": "Omar Gaber",
    "displayName": "عمر جابر",
    "aliases": [
      "جابر"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-eg-24",
    "name": "Mohamed Elneny",
    "displayName": "محمد النني",
    "aliases": [
      "النني",
      "elneny"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-eg-25",
    "name": "Tarek Hamed",
    "displayName": "طارق حامد",
    "aliases": [
      "حامد",
      "قلب الأسد"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-eg-26",
    "name": "Hamdy Fathi",
    "displayName": "حمدي فتحي",
    "aliases": [
      "فتحي"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-eg-27",
    "name": "Marwan Attia",
    "displayName": "مروان عطية",
    "aliases": [
      "عطية"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-eg-28",
    "name": "Abdallah El Said",
    "displayName": "عبد الله السعيد",
    "aliases": [
      "عبدالله السعيد"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-eg-29",
    "name": "Walid Soliman",
    "displayName": "وليد سليمان",
    "aliases": [
      "الحاوي",
      "سليمان"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-30",
    "name": "Amr El Solia",
    "displayName": "عمرو السولية",
    "aliases": [
      "السولية"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-eg-31",
    "name": "Mostafa Fathi",
    "displayName": "مصطفى فتحي",
    "aliases": [
      "مصطفي فتحي",
      "الحريف"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-eg-32",
    "name": "Ramadan Sobhi",
    "displayName": "رمضان صبحي",
    "aliases": [
      "رمضونا",
      "صبحي"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-eg-33",
    "name": "Ahmed Refaat",
    "displayName": "أحمد رفعت",
    "aliases": [
      "رفعت"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-34",
    "name": "Mostafa Mohamed",
    "displayName": "مصطفى محمد",
    "aliases": [
      "البلدوزر",
      "الأناكوندا"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-eg-35",
    "name": "Amr Zaki",
    "displayName": "عمرو زكي",
    "aliases": [
      "البلدوزر عمرو زكي"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-36",
    "name": "Mido",
    "displayName": "أحمد حسام ميدو",
    "aliases": [
      "ميدو",
      "العالمي",
      "ahmed hossam mido"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-37",
    "name": "Emad Moteab",
    "displayName": "عماد متعب",
    "aliases": [
      "متعب",
      "جلاد الحراس",
      "قناص الأهلي"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-38",
    "name": "Mohamed Nagy Gedo",
    "displayName": "محمد ناجي جدو",
    "aliases": [
      "جدو",
      "هداف أمم إفريقيا 2010"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-39",
    "name": "Gamal Abdelhamid",
    "displayName": "جمال عبد الحميد",
    "aliases": [
      "كابتن مصر في المونديال"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-40",
    "name": "Hossam Ghaly",
    "displayName": "حسام غالي",
    "aliases": [
      "الكابيتانو",
      "غالي"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-41",
    "name": "Mohamed Shawky",
    "displayName": "محمد شوقي",
    "aliases": [
      "شوقي"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-42",
    "name": "Hosam Ashour",
    "displayName": "حسام عاشور",
    "aliases": [
      "عاشور",
      "مسمار الوسط"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-43",
    "name": "Ahmed Fathi",
    "displayName": "أحمد فتحي",
    "aliases": [
      "الجوكر"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-44",
    "name": "Sayed Abdelhafiz",
    "displayName": "سيد عبد الحفيظ",
    "aliases": [
      "عبد الحفيظ"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-45",
    "name": "Khaled Bibo",
    "displayName": "خالد بيبو",
    "aliases": [
      "سوبر بيبو",
      "بيبو سوبر هاتريك"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-46",
    "name": "Walid Salah El Din",
    "displayName": "وليد صلاح الدين",
    "aliases": [
      "أمير الموهوبين"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-47",
    "name": "Yasser Rayan",
    "displayName": "ياسر ريان",
    "aliases": [
      "قطار الجبهة اليسرى"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-48",
    "name": "Taha Ismail",
    "displayName": "طه إسماعيل",
    "aliases": [
      "الشيخ طه"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-49",
    "name": "Hassan Shehata",
    "displayName": "حسن شحاتة",
    "aliases": [
      "المعلم",
      "حسن شحاته"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-50",
    "name": "Farouk Gaafar",
    "displayName": "فاروق جعفر",
    "aliases": [
      "ملك النص",
      "روقا"
    ],
    "nationality": "مصر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-eg-51",
    "name": "Ali Abo Greisha",
    "displayName": "علي أبو جريشة",
    "aliases": [
      "فاكهة الكرة المصرية"
    ],
    "nationality": "مصر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-eg-52",
    "name": "Ahmed Eid Abdel Malek",
    "displayName": "أحمد عيد عبد الملك",
    "aliases": [
      "عيد عبد الملك"
    ],
    "nationality": "مصر",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-eg-53",
    "name": "Mahmoud Fathallah",
    "displayName": "محمود فتح الله",
    "aliases": [
      "فتح الله"
    ],
    "nationality": "مصر",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-eg-54",
    "name": "Mohamed Sobhy",
    "displayName": "محمد صبحي",
    "aliases": [
      "صبحي حارس المرمى"
    ],
    "nationality": "مصر",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-eg-55",
    "name": "Ahmed El Shenawy",
    "displayName": "أحمد الشناوي",
    "aliases": [
      "الشناوي حارس بيراميدز"
    ],
    "nationality": "مصر",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-ar-1",
    "name": "Hakim Ziyech",
    "displayName": "حكيم زياش",
    "aliases": [
      "زياش",
      "ziyech"
    ],
    "nationality": "المغرب",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-ar-2",
    "name": "Sofyan Amrabat",
    "displayName": "سفيان أمرابط",
    "aliases": [
      "أمرابط",
      "amrabat",
      "امرابط"
    ],
    "nationality": "المغرب",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-ar-3",
    "name": "Azzedine Ounahi",
    "displayName": "عز الدين أوناحي",
    "aliases": [
      "أوناحي",
      "ounahi",
      "اوناحي"
    ],
    "nationality": "المغرب",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-ar-4",
    "name": "Youssef En-Nesyri",
    "displayName": "يوسف النصيري",
    "aliases": [
      "النصيري",
      "en nesyri"
    ],
    "nationality": "المغرب",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-ar-5",
    "name": "Romain Saïss",
    "displayName": "رومان سايس",
    "aliases": [
      "سايس",
      "saiss"
    ],
    "nationality": "المغرب",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-ar-6",
    "name": "Nayef Aguerd",
    "displayName": "نايف أكرد",
    "aliases": [
      "أكرد",
      "aguerd",
      "اكرد"
    ],
    "nationality": "المغرب",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-ar-7",
    "name": "Sofiane Boufal",
    "displayName": "سفيان بوفال",
    "aliases": [
      "بوفال",
      "boufal"
    ],
    "nationality": "المغرب",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-ar-8",
    "name": "Mustapha Hadji",
    "displayName": "مصطفى حجي",
    "aliases": [
      "حجي",
      "hadji"
    ],
    "nationality": "المغرب",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-ar-9",
    "name": "Noureddine Naybet",
    "displayName": "نور الدين النيبت",
    "aliases": [
      "النيبت",
      "naybet"
    ],
    "nationality": "المغرب",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-ar-10",
    "name": "Baddou Zaki",
    "displayName": "بادو الزاكي",
    "aliases": [
      "الزاكي",
      "zaki"
    ],
    "nationality": "المغرب",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-ar-11",
    "name": "Salaheddine Bassir",
    "displayName": "صلاح الدين بصير",
    "aliases": [
      "بصير",
      "bassir"
    ],
    "nationality": "المغرب",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-ar-12",
    "name": "Ismaël Bennacer",
    "displayName": "إسماعيل بن ناصر",
    "aliases": [
      "بن ناصر",
      "bennacer",
      "اسماعيل بن ناصر"
    ],
    "nationality": "الجزائر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-ar-13",
    "name": "Sofiane Feghouli",
    "displayName": "سفيان فيغولي",
    "aliases": [
      "فيغولي",
      "feghouli"
    ],
    "nationality": "الجزائر",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-ar-14",
    "name": "Yacine Brahimi",
    "displayName": "ياسين براهيمي",
    "aliases": [
      "براهيمي",
      "brahimi"
    ],
    "nationality": "الجزائر",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-ar-15",
    "name": "Islam Slimani",
    "displayName": "إسلام سليماني",
    "aliases": [
      "سليماني",
      "slimani",
      "اسلام سليماني"
    ],
    "nationality": "الجزائر",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-ar-16",
    "name": "Baghdad Bounedjah",
    "displayName": "بغداد بونجاح",
    "aliases": [
      "بونجاح",
      "bounedjah"
    ],
    "nationality": "الجزائر",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-ar-17",
    "name": "Rabah Madjer",
    "displayName": "رابح ماجر",
    "aliases": [
      "ماجر",
      "صاحب الكعب الذهبي",
      "madjer"
    ],
    "nationality": "الجزائر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-ar-18",
    "name": "Lakhdar Belloumi",
    "displayName": "لخضر بلومي",
    "aliases": [
      "بلومي",
      "belloumi"
    ],
    "nationality": "الجزائر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-ar-19",
    "name": "Ali Bencheikh",
    "displayName": "علي بن شيخ",
    "aliases": [
      "بن شيخ"
    ],
    "nationality": "الجزائر",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-ar-20",
    "name": "Wahbi Khazri",
    "displayName": "وهبي الخزري",
    "aliases": [
      "الخزري",
      "khazri"
    ],
    "nationality": "تونس",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-ar-21",
    "name": "Youssef Msakni",
    "displayName": "يوسف المساكني",
    "aliases": [
      "المساكني",
      "النمس",
      "msakni"
    ],
    "nationality": "تونس",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-ar-22",
    "name": "Ali Maâloul",
    "displayName": "علي معلول",
    "aliases": [
      "معلول",
      "علولو",
      "maaloul"
    ],
    "nationality": "تونس",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-ar-23",
    "name": "Aïssa Laïdouni",
    "displayName": "عيسى العيدوني",
    "aliases": [
      "العيدوني",
      "laidouni"
    ],
    "nationality": "تونس",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-ar-24",
    "name": "Ellyes Skhiri",
    "displayName": "إلياس السخيري",
    "aliases": [
      "السخيري",
      "skhiri",
      "الياس السخيري"
    ],
    "nationality": "تونس",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-ar-25",
    "name": "Tarak Dhiab",
    "displayName": "طارق ذياب",
    "aliases": [
      "ذياب",
      "إمبراطور الكرة التونسية"
    ],
    "nationality": "تونس",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-ar-26",
    "name": "Radhi Jaïdi",
    "displayName": "راضي الجعايدي",
    "aliases": [
      "الجعايدي",
      "jaidi"
    ],
    "nationality": "تونس",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-ar-27",
    "name": "Chokri El Ouaer",
    "displayName": "شكري الواعر",
    "aliases": [
      "الواعر",
      "el ouaer"
    ],
    "nationality": "تونس",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-ar-28",
    "name": "Salem Al-Dawsari",
    "displayName": "سالم الدوسري",
    "aliases": [
      "الدوسري",
      "التورنيدو",
      "al dawsari"
    ],
    "nationality": "السعودية",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-ar-29",
    "name": "Fahad Al-Muwallad",
    "displayName": "فهد المولد",
    "aliases": [
      "المولد",
      "al muwallad"
    ],
    "nationality": "السعودية",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-ar-30",
    "name": "Majed Abdullah",
    "displayName": "ماجد عبد الله",
    "aliases": [
      "ماجد عبدالله",
      "السهم الملتهب",
      "بيليه الصحراء"
    ],
    "nationality": "السعودية",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-ar-31",
    "name": "Sami Al-Jaber",
    "displayName": "سامي الجابر",
    "aliases": [
      "الجابر",
      "الذئب سامي"
    ],
    "nationality": "السعودية",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-ar-32",
    "name": "Mohammad Al-Deayea",
    "displayName": "محمد الدعيع",
    "aliases": [
      "الدعيع",
      "أخطبوط الحراسة",
      "عميد لاعبي العالم"
    ],
    "nationality": "السعودية",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-ar-33",
    "name": "Saeed Al-Owairan",
    "displayName": "سعيد العويران",
    "aliases": [
      "العويران",
      "مارادونا العرب"
    ],
    "nationality": "السعودية",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-1",
    "name": "Pelé",
    "displayName": "بيليه",
    "aliases": [
      "الجوهرة السوداء",
      "pele",
      "ادسون ارانتيس"
    ],
    "nationality": "البرازيل",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-2",
    "name": "Diego Maradona",
    "displayName": "دييجو مارادونا",
    "aliases": [
      "مارادونا",
      "الفتى الذهبي",
      "maradona"
    ],
    "nationality": "الأرجنتين",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-3",
    "name": "Johan Cruyff",
    "displayName": "يوهان كرويف",
    "aliases": [
      "كرويف",
      "عراب الكرة الشاملة",
      "cruyff"
    ],
    "nationality": "هولندا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-4",
    "name": "Franz Beckenbauer",
    "displayName": "فرانز بيكنباور",
    "aliases": [
      "القيصر",
      "بيكنباور",
      "beckenbauer"
    ],
    "nationality": "ألمانيا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-5",
    "name": "Alfredo Di Stéfano",
    "displayName": "ألفريدو دي ستيفانو",
    "aliases": [
      "دي ستيفانو",
      "السهم الأشقر",
      "di stefano"
    ],
    "nationality": "الأرجنتين",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-6",
    "name": "Ferenc Puskás",
    "displayName": "فيرينتس بوشكاش",
    "aliases": [
      "بوشكاش",
      "المدفعجي المجري",
      "puskas"
    ],
    "nationality": "المجر",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-7",
    "name": "George Best",
    "displayName": "جورج بيست",
    "aliases": [
      "بيست",
      "best"
    ],
    "nationality": "أيرلندا الشمالية",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-intl-8",
    "name": "Eusébio",
    "displayName": "أوزيبيو",
    "aliases": [
      "الفهد الأسود",
      "eusebio"
    ],
    "nationality": "البرتغال",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-9",
    "name": "Gerd Müller",
    "displayName": "غيرد مولر",
    "aliases": [
      "جيرد مولر",
      "دير بومبر",
      "gerd muller"
    ],
    "nationality": "ألمانيا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-10",
    "name": "Michel Platini",
    "displayName": "ميشيل بلاتيني",
    "aliases": [
      "بلاتيني",
      "platini"
    ],
    "nationality": "فرنسا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-11",
    "name": "Marco van Basten",
    "displayName": "ماركو فان باستن",
    "aliases": [
      "فان باستن",
      "van basten"
    ],
    "nationality": "هولندا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-12",
    "name": "Ruud Gullit",
    "displayName": "رود خوليت",
    "aliases": [
      "خوليت",
      "gullit"
    ],
    "nationality": "هولندا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-13",
    "name": "Frank Rijkaard",
    "displayName": "فرانك ريكارد",
    "aliases": [
      "ريكارد",
      "rijkaard"
    ],
    "nationality": "هولندا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-14",
    "name": "Paolo Maldini",
    "displayName": "باولو مالديني",
    "aliases": [
      "مالديني",
      "المايسترو الدفاعي",
      "maldini"
    ],
    "nationality": "إيطاليا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-15",
    "name": "Franco Baresi",
    "displayName": "فرانكو باريزي",
    "aliases": [
      "باريزي",
      "baresi"
    ],
    "nationality": "إيطاليا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-16",
    "name": "Alessandro Nesta",
    "displayName": "أليساندرو نيستا",
    "aliases": [
      "نيستا",
      "nesta"
    ],
    "nationality": "إيطاليا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-17",
    "name": "Fabio Cannavaro",
    "displayName": "فابيو كانافارو",
    "aliases": [
      "كانافارو",
      "جدار برلين",
      "cannavaro"
    ],
    "nationality": "إيطاليا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-18",
    "name": "Roberto Carlos",
    "displayName": "روبرتو كارلوس",
    "aliases": [
      "المدفع البرازيلي",
      "roberto carlos"
    ],
    "nationality": "البرازيل",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-19",
    "name": "Cafu",
    "displayName": "كافو",
    "aliases": [
      "القطار السريع",
      "cafu"
    ],
    "nationality": "البرازيل",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-20",
    "name": "Javier Zanetti",
    "displayName": "خافيير زانيتي",
    "aliases": [
      "زانيتي",
      "التراكتور",
      "zanetti"
    ],
    "nationality": "الأرجنتين",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-21",
    "name": "Lothar Matthäus",
    "displayName": "لوثار ماتيوس",
    "aliases": [
      "ماتيوس",
      "matthaus"
    ],
    "nationality": "ألمانيا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-22",
    "name": "Andrea Pirlo",
    "displayName": "أندريا بيرلو",
    "aliases": [
      "بيرلو",
      "المايسترو بيرلو",
      "pirlo"
    ],
    "nationality": "إيطاليا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-23",
    "name": "Paul Scholes",
    "displayName": "بول سكولز",
    "aliases": [
      "سكولز",
      "scholes"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-24",
    "name": "Steven Gerrard",
    "displayName": "ستيفن جيرارد",
    "aliases": [
      "جيرارد",
      "gerrard"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-25",
    "name": "Frank Lampard",
    "displayName": "فرانك لامبارد",
    "aliases": [
      "لامبارد",
      "lampard"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-26",
    "name": "Patrick Vieira",
    "displayName": "باتريك فييرا",
    "aliases": [
      "فييرا",
      "vieira"
    ],
    "nationality": "فرنسا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-27",
    "name": "Roy Keane",
    "displayName": "روي كين",
    "aliases": [
      "كين",
      "keane"
    ],
    "nationality": "أيرلندا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-28",
    "name": "Clarence Seedorf",
    "displayName": "كلارنس سيدورف",
    "aliases": [
      "سيدورف",
      "seedorf"
    ],
    "nationality": "هولندا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-29",
    "name": "Michael Ballack",
    "displayName": "مايكل بالاك",
    "aliases": [
      "بالاك",
      "ballack"
    ],
    "nationality": "ألمانيا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-30",
    "name": "Pavel Nedvěd",
    "displayName": "بافل نيدفيد",
    "aliases": [
      "نيدفيد",
      "الصاروخ التشيكي",
      "nedved"
    ],
    "nationality": "التشيك",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-31",
    "name": "Dennis Bergkamp",
    "displayName": "دينيس بيركامب",
    "aliases": [
      "بيركامب",
      "الهولندي غير الطائر",
      "bergkamp"
    ],
    "nationality": "هولندا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-32",
    "name": "Ronaldinho",
    "displayName": "رونالدينيو",
    "aliases": [
      "الساحر البرازيلي",
      "ronaldinho",
      "روني"
    ],
    "nationality": "البرازيل",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-intl-33",
    "name": "Rivaldo",
    "displayName": "ريفالدو",
    "aliases": [
      "الساحر ريفالدو",
      "rivaldo"
    ],
    "nationality": "البرازيل",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-34",
    "name": "Romário",
    "displayName": "روماريو",
    "aliases": [
      "الفينومينو الصغير",
      "romario"
    ],
    "nationality": "البرازيل",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-35",
    "name": "Gabriel Batistuta",
    "displayName": "جابرييل باتيستوتا",
    "aliases": [
      "باتيستوتا",
      "باتيجول",
      "batistuta"
    ],
    "nationality": "الأرجنتين",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-36",
    "name": "Hernán Crespo",
    "displayName": "هيرنان كريسبو",
    "aliases": [
      "كريسبو",
      "crespo"
    ],
    "nationality": "الأرجنتين",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-37",
    "name": "Andriy Shevchenko",
    "displayName": "أندريه شيفشينكو",
    "aliases": [
      "شيفشينكو",
      "القطار الأوكراني",
      "shevchenko"
    ],
    "nationality": "أوكرانيا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-38",
    "name": "Ruud van Nistelrooy",
    "displayName": "رود فان نيستلروي",
    "aliases": [
      "فان نيستلروي",
      "van nistelrooy"
    ],
    "nationality": "هولندا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-39",
    "name": "Raúl González",
    "displayName": "راؤول جونزاليس",
    "aliases": [
      "راؤول",
      "روح البلانكو",
      "raul"
    ],
    "nationality": "إسبانيا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-40",
    "name": "Alessandro Del Piero",
    "displayName": "أليساندرو ديل بييرو",
    "aliases": [
      "ديل بييرو",
      "البينتوريكيو",
      "del piero"
    ],
    "nationality": "إيطاليا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-41",
    "name": "Francesco Totti",
    "displayName": "فرانشيسكو توتي",
    "aliases": [
      "توتي",
      "ملك روما",
      "totti"
    ],
    "nationality": "إيطاليا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-42",
    "name": "David Beckham",
    "displayName": "ديفيد بيكهام",
    "aliases": [
      "بيكهام",
      "الفيريكيكر",
      "beckham"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-43",
    "name": "Ryan Giggs",
    "displayName": "ريان جيجز",
    "aliases": [
      "جيجز",
      "giggs"
    ],
    "nationality": "ويلز",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-intl-44",
    "name": "Wayne Rooney",
    "displayName": "واين روني",
    "aliases": [
      "روني",
      "الفتى الذهبي روني",
      "rooney"
    ],
    "nationality": "إنجلترا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-45",
    "name": "Robin van Persie",
    "displayName": "روبين فان بيرسي",
    "aliases": [
      "فان بيرسي",
      "الهولندي الطائر",
      "van persie"
    ],
    "nationality": "هولندا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-46",
    "name": "Sergio Agüero",
    "displayName": "سيرجيو أجويرو",
    "aliases": [
      "أجويرو",
      "الكون",
      "aguero"
    ],
    "nationality": "الأرجنتين",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-47",
    "name": "Arjen Robben",
    "displayName": "آريين روبن",
    "aliases": [
      "روبن",
      "صاحب القدم اليسرى",
      "robben"
    ],
    "nationality": "هولندا",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-intl-48",
    "name": "Franck Ribéry",
    "displayName": "فرانك ريبيري",
    "aliases": [
      "ريبيري",
      "البلال",
      "ribery"
    ],
    "nationality": "فرنسا",
    "position": "جناح",
    "isRetired": true
  },
  {
    "id": "idx-intl-49",
    "name": "Bastian Schweinsteiger",
    "displayName": "باستيان شفاينشتايجر",
    "aliases": [
      "شفاينشتايجر",
      "schweinsteiger"
    ],
    "nationality": "ألمانيا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-50",
    "name": "Philipp Lahm",
    "displayName": "فيليب لام",
    "aliases": [
      "لام",
      "البروفيسور الصغير",
      "lahm"
    ],
    "nationality": "ألمانيا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-51",
    "name": "Carles Puyol",
    "displayName": "كارليس بويول",
    "aliases": [
      "بويول",
      "قلب الأسد الكتالوني",
      "puyol"
    ],
    "nationality": "إسبانيا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-52",
    "name": "Gerard Piqué",
    "displayName": "جيرارد بيكيه",
    "aliases": [
      "بيكيه",
      "pique"
    ],
    "nationality": "إسبانيا",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-53",
    "name": "Dani Alves",
    "displayName": "داني ألفيس",
    "aliases": [
      "ألفيس",
      "dani alves",
      "الفيس"
    ],
    "nationality": "البرازيل",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-54",
    "name": "Marcelo",
    "displayName": "مارسيلو",
    "aliases": [
      "مارسيلو فييرا",
      "marcelo"
    ],
    "nationality": "البرازيل",
    "position": "مدافع",
    "isRetired": true
  },
  {
    "id": "idx-intl-55",
    "name": "Oliver Kahn",
    "displayName": "أوليفر كان",
    "aliases": [
      "كان",
      "التيتان",
      "oliver kahn"
    ],
    "nationality": "ألمانيا",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-56",
    "name": "Peter Schmeichel",
    "displayName": "بيتر شمايكل",
    "aliases": [
      "شمايكل",
      "peter schmeichel"
    ],
    "nationality": "الدنمارك",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-57",
    "name": "Edwin van der Sar",
    "displayName": "أدوين فان دير سار",
    "aliases": [
      "فان دير سار",
      "van der sar"
    ],
    "nationality": "هولندا",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-58",
    "name": "Petr Čech",
    "displayName": "بيتر تشيك",
    "aliases": [
      "تشيك",
      "حارس الخوذة",
      "petr cech"
    ],
    "nationality": "التشيك",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-59",
    "name": "Dino Zoff",
    "displayName": "دينو زوف",
    "aliases": [
      "زوف",
      "zoff"
    ],
    "nationality": "إيطاليا",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-60",
    "name": "Lev Yashin",
    "displayName": "ليف ياشين",
    "aliases": [
      "ياشين",
      "العنكبوت الأسود",
      "yashin"
    ],
    "nationality": "روسيا",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-61",
    "name": "Gordon Banks",
    "displayName": "جوردون بانكس",
    "aliases": [
      "بانكس",
      "banks"
    ],
    "nationality": "إنجلترا",
    "position": "حارس مرمى",
    "isRetired": true
  },
  {
    "id": "idx-intl-62",
    "name": "Samuel Eto'o",
    "displayName": "صامويل إيتو",
    "aliases": [
      "إيتو",
      "الأسد الكاميروني",
      "etoo",
      "ايتو"
    ],
    "nationality": "الكاميرون",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-63",
    "name": "George Weah",
    "displayName": "جورج وياه",
    "aliases": [
      "وياه",
      "رئيس ليبيريا الكروي",
      "weah"
    ],
    "nationality": "ليبيريا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-64",
    "name": "Jay-Jay Okocha",
    "displayName": "جاي جاي أوكوشا",
    "aliases": [
      "أوكوشا",
      "الساحر النيجيري",
      "okocha"
    ],
    "nationality": "نيجيريا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-65",
    "name": "Nwankwo Kanu",
    "displayName": "نوانكو كانو",
    "aliases": [
      "كانو",
      "kanu"
    ],
    "nationality": "نيجيريا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-66",
    "name": "Michael Essien",
    "displayName": "مايكل إيسيان",
    "aliases": [
      "إيسيان",
      "القطار الغاني",
      "essien"
    ],
    "nationality": "غانا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-67",
    "name": "Roger Milla",
    "displayName": "روجيه ميلا",
    "aliases": [
      "ميلا",
      "العجوز الراقص",
      "milla"
    ],
    "nationality": "الكاميرون",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-68",
    "name": "Patrick Kluivert",
    "displayName": "باتريك كلايفرت",
    "aliases": [
      "كلايفرت",
      "kluivert"
    ],
    "nationality": "هولندا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-69",
    "name": "Michael Owen",
    "displayName": "مايكل أوين",
    "aliases": [
      "أوين",
      "الفتى المعجزة",
      "owen"
    ],
    "nationality": "إنجلترا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-70",
    "name": "Alan Shearer",
    "displayName": "ألان شيرر",
    "aliases": [
      "شيرر",
      "الهداف التاريخي للبريميرليج",
      "shearer"
    ],
    "nationality": "إنجلترا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-71",
    "name": "Hristo Stoichkov",
    "displayName": "خريستو ستويتشكوف",
    "aliases": [
      "ستويتشكوف",
      "stoichkov"
    ],
    "nationality": "بلغاريا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-72",
    "name": "Gheorghe Hagi",
    "displayName": "جورجي هاجي",
    "aliases": [
      "هاجي",
      "مارادونا البلقان",
      "hagi"
    ],
    "nationality": "رومانيا",
    "position": "لاعب وسط",
    "isRetired": true
  },
  {
    "id": "idx-intl-73",
    "name": "Davor Šuker",
    "displayName": "دافور شوكر",
    "aliases": [
      "شوكر",
      "suker"
    ],
    "nationality": "كرواتيا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-74",
    "name": "Miroslav Klose",
    "displayName": "ميروسلاف كلوزه",
    "aliases": [
      "كلوزه",
      "الهداف التاريخي للمونديال",
      "klose"
    ],
    "nationality": "ألمانيا",
    "position": "مهاجم",
    "isRetired": true
  },
  {
    "id": "idx-intl-75",
    "name": "Rodri",
    "displayName": "رودري",
    "aliases": [
      "رودري هيرنانديز",
      "rodri"
    ],
    "nationality": "إسبانيا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-76",
    "name": "Phil Foden",
    "displayName": "فيل فودين",
    "aliases": [
      "فودين",
      "foden"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-77",
    "name": "Bukayo Saka",
    "displayName": "بوكايو ساكا",
    "aliases": [
      "ساكا",
      "saka"
    ],
    "nationality": "إنجلترا",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-78",
    "name": "Declan Rice",
    "displayName": "ديكلان رايس",
    "aliases": [
      "رايس",
      "rice"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-79",
    "name": "Cole Palmer",
    "displayName": "كول بالمر",
    "aliases": [
      "بالمر",
      "palmer"
    ],
    "nationality": "إنجلترا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-80",
    "name": "Martin Ødegaard",
    "displayName": "مارتن أوديغارد",
    "aliases": [
      "أوديغارد",
      "odegaard"
    ],
    "nationality": "النرويج",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-81",
    "name": "William Saliba",
    "displayName": "ويليام صليبا",
    "aliases": [
      "صليبا",
      "saliba"
    ],
    "nationality": "فرنسا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-82",
    "name": "Gabriel Magalhães",
    "displayName": "جابرييل ماجالهايس",
    "aliases": [
      "ماجالهايس"
    ],
    "nationality": "البرازيل",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-83",
    "name": "Bruno Fernandes",
    "displayName": "برونو فيرنانديز",
    "aliases": [
      "برونو",
      "bruno fernandes"
    ],
    "nationality": "البرتغال",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-84",
    "name": "Bernardo Silva",
    "displayName": "برناردو سيلفا",
    "aliases": [
      "برناردو",
      "bernardo silva"
    ],
    "nationality": "البرتغال",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-85",
    "name": "Rúben Dias",
    "displayName": "روبن دياز",
    "aliases": [
      "دياز",
      "ruben dias"
    ],
    "nationality": "البرتغال",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-86",
    "name": "Ederson",
    "displayName": "إيدرسون مورايس",
    "aliases": [
      "إيدرسون",
      "ederson"
    ],
    "nationality": "البرازيل",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-intl-87",
    "name": "Alisson Becker",
    "displayName": "أليسون بيكر",
    "aliases": [
      "أليسون",
      "alisson"
    ],
    "nationality": "البرازيل",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-intl-88",
    "name": "Virgil van Dijk",
    "displayName": "فيرجيل فان دايك",
    "aliases": [
      "فان دايك",
      "van dijk"
    ],
    "nationality": "هولندا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-89",
    "name": "Trent Alexander-Arnold",
    "displayName": "ترينت ألكسندر أرنولد",
    "aliases": [
      "أرنولد",
      "trent"
    ],
    "nationality": "إنجلترا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-90",
    "name": "Andrew Robertson",
    "displayName": "أندرو روبرتسون",
    "aliases": [
      "روبرتسون",
      "robertson"
    ],
    "nationality": "إسكتلندا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-91",
    "name": "Alexis Mac Allister",
    "displayName": "أليكسيس ماك أليستير",
    "aliases": [
      "ماك أليستير",
      "mac allister"
    ],
    "nationality": "الأرجنتين",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-92",
    "name": "Federico Valverde",
    "displayName": "فيديريكو فالفيردي",
    "aliases": [
      "فالفيردي",
      "valverde"
    ],
    "nationality": "أوروجواي",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-93",
    "name": "Eduardo Camavinga",
    "displayName": "إدواردو كامافينجا",
    "aliases": [
      "كامافينجا",
      "camavinga"
    ],
    "nationality": "فرنسا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-94",
    "name": "Aurélien Tchouaméni",
    "displayName": "أوريلين تشواميني",
    "aliases": [
      "تشواميني",
      "tchouameni"
    ],
    "nationality": "فرنسا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-95",
    "name": "Rodrygo",
    "displayName": "رودريجو جويس",
    "aliases": [
      "رودريجو",
      "rodrygo"
    ],
    "nationality": "البرازيل",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-96",
    "name": "Antonio Rüdiger",
    "displayName": "أنطونيو روديجر",
    "aliases": [
      "روديجر",
      "rudiger"
    ],
    "nationality": "ألمانيا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-97",
    "name": "Éder Militão",
    "displayName": "إيدير ميليتاو",
    "aliases": [
      "ميليتاو",
      "militao"
    ],
    "nationality": "البرازيل",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-98",
    "name": "Pedri",
    "displayName": "بيدري جونزاليس",
    "aliases": [
      "بيدري",
      "pedri"
    ],
    "nationality": "إسبانيا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-99",
    "name": "Gavi",
    "displayName": "بابلو جافي",
    "aliases": [
      "جافي",
      "gavi"
    ],
    "nationality": "إسبانيا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-100",
    "name": "Robert Lewandowski",
    "displayName": "روبرت ليفاندوفسكي",
    "aliases": [
      "ليفاندوفسكي",
      "ليفا",
      "lewandowski"
    ],
    "nationality": "بولندا",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-101",
    "name": "Raphinha",
    "displayName": "رافينيا دياز",
    "aliases": [
      "رافينيا",
      "raphinha"
    ],
    "nationality": "البرازيل",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-102",
    "name": "Frenkie de Jong",
    "displayName": "فرينكي دي يونج",
    "aliases": [
      "دي يونج",
      "de jong"
    ],
    "nationality": "هولندا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-103",
    "name": "Jules Koundé",
    "displayName": "جول كوندي",
    "aliases": [
      "كوندي",
      "kounde"
    ],
    "nationality": "فرنسا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-104",
    "name": "Ronald Araújo",
    "displayName": "رونالد أراوخو",
    "aliases": [
      "أراوخو",
      "araujo"
    ],
    "nationality": "أوروجواي",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-105",
    "name": "Ousmane Dembélé",
    "displayName": "عثمان ديمبيلي",
    "aliases": [
      "عثمان ديمبلي",
      "dembele"
    ],
    "nationality": "فرنسا",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-106",
    "name": "Antoine Griezmann",
    "displayName": "أنطوان جريزمان",
    "aliases": [
      "جريزمان",
      "griezmann"
    ],
    "nationality": "فرنسا",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-107",
    "name": "Jan Oblak",
    "displayName": "يان أوبلاك",
    "aliases": [
      "أوبلاك",
      "oblak"
    ],
    "nationality": "سلوفينيا",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-intl-108",
    "name": "Lautaro Martínez",
    "displayName": "لاوتارو مارتينيز",
    "aliases": [
      "لاوتارو",
      "التورو",
      "lautaro"
    ],
    "nationality": "الأرجنتين",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-109",
    "name": "Nicolò Barella",
    "displayName": "نيكولو باريلا",
    "aliases": [
      "باريلا",
      "barella"
    ],
    "nationality": "إيطاليا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-110",
    "name": "Alessandro Bastoni",
    "displayName": "أليساندرو باستوني",
    "aliases": [
      "باستوني",
      "bastoni"
    ],
    "nationality": "إيطاليا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-111",
    "name": "Victor Osimhen",
    "displayName": "فيكتور أوسيمين",
    "aliases": [
      "أوسيمين",
      "قناع نابولي",
      "osimhen"
    ],
    "nationality": "نيجيريا",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-112",
    "name": "Khvicha Kvaratskhelia",
    "displayName": "خفيتشا كفاراتسخيليا",
    "aliases": [
      "كفاراتسخيليا",
      "كفارا",
      "kvaratskhelia"
    ],
    "nationality": "جورجيا",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-113",
    "name": "Rafael Leão",
    "displayName": "رفائيل لياو",
    "aliases": [
      "لياو",
      "leao"
    ],
    "nationality": "البرتغال",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-114",
    "name": "Théo Hernandez",
    "displayName": "ثيو هيرنانديز",
    "aliases": [
      "ثيو",
      "theo hernandez"
    ],
    "nationality": "فرنسا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-115",
    "name": "Mike Maignan",
    "displayName": "مايك ماينان",
    "aliases": [
      "ماينان",
      "النسر السحري",
      "maignan"
    ],
    "nationality": "فرنسا",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-intl-116",
    "name": "Harry Kane",
    "displayName": "هاري كين",
    "aliases": [
      "هاري كين الهداف",
      "kane"
    ],
    "nationality": "إنجلترا",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-117",
    "name": "Son Heung-min",
    "displayName": "سون هيونج مين",
    "aliases": [
      "سون",
      "son"
    ],
    "nationality": "كوريا الجنوبية",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-118",
    "name": "Florian Wirtz",
    "displayName": "فلوريان فيرتز",
    "aliases": [
      "فيرتز",
      "wirtz"
    ],
    "nationality": "ألمانيا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-119",
    "name": "Jamal Musiala",
    "displayName": "جمال موسيالا",
    "aliases": [
      "موسيالا",
      "بامبي",
      "musiala"
    ],
    "nationality": "ألمانيا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-120",
    "name": "Leroy Sané",
    "displayName": "ليروي ساني",
    "aliases": [
      "ساني",
      "sane"
    ],
    "nationality": "ألمانيا",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-121",
    "name": "Joshua Kimmich",
    "displayName": "جوشوا كيميش",
    "aliases": [
      "كيميش",
      "kimmich"
    ],
    "nationality": "ألمانيا",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-122",
    "name": "Alphonso Davies",
    "displayName": "ألفونسو ديفيز",
    "aliases": [
      "ديفيز",
      "الصوت السريع",
      "davies"
    ],
    "nationality": "كندا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-123",
    "name": "Dayot Upamecano",
    "displayName": "دايوت أوباميكانو",
    "aliases": [
      "أوباميكانو",
      "upamecano"
    ],
    "nationality": "فرنسا",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-124",
    "name": "Gregor Kobel",
    "displayName": "جريجور كوبيل",
    "aliases": [
      "كوبيل",
      "kobel"
    ],
    "nationality": "سويسرا",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-intl-125",
    "name": "Julián Álvarez",
    "displayName": "جوليان ألفاريز",
    "aliases": [
      "العنكبوت الأرجنتيني",
      "alvarez"
    ],
    "nationality": "الأرجنتين",
    "position": "مهاجم",
    "isRetired": false
  },
  {
    "id": "idx-intl-126",
    "name": "Enzo Fernández",
    "displayName": "إنزو فيرنانديز",
    "aliases": [
      "إنزو",
      "enzo fernandez"
    ],
    "nationality": "الأرجنتين",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-127",
    "name": "Emiliano Martínez",
    "displayName": "إيميليانو مارتينيز",
    "aliases": [
      "ديبو",
      "ديبو مارتينيز",
      "dibu martinez"
    ],
    "nationality": "الأرجنتين",
    "position": "حارس مرمى",
    "isRetired": false
  },
  {
    "id": "idx-intl-128",
    "name": "Cristian Romero",
    "displayName": "كريستيان روميرو",
    "aliases": [
      "كوتي",
      "romero"
    ],
    "nationality": "الأرجنتين",
    "position": "مدافع",
    "isRetired": false
  },
  {
    "id": "idx-intl-129",
    "name": "Bruno Guimarães",
    "displayName": "برونو جيماريش",
    "aliases": [
      "جيماريش",
      "guimaraes"
    ],
    "nationality": "البرازيل",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-130",
    "name": "Lucas Paquetá",
    "displayName": "لوكاس باكيتا",
    "aliases": [
      "باكيتا",
      "paqueta"
    ],
    "nationality": "البرازيل",
    "position": "لاعب وسط",
    "isRetired": false
  },
  {
    "id": "idx-intl-131",
    "name": "Gabriel Martinelli",
    "displayName": "جابرييل مارتينيلي",
    "aliases": [
      "مارتينيلي",
      "martinelli"
    ],
    "nationality": "البرازيل",
    "position": "جناح",
    "isRetired": false
  },
  {
    "id": "idx-intl-132",
    "name": "Marcus Rashford",
    "displayName": "ماركوس راشفورد",
    "aliases": [
      "راشفورد",
      "rashford"
    ],
    "nationality": "إنجلترا",
    "position": "مهاجم",
    "isRetired": false
  }
];

export function searchPlayersIndex(query: string): IndexPlayer[] {
  const normQuery = normalizeSearch(query);
  if (normQuery.length < 2) return [];
  const queryNoAl = stripAl(normQuery);

  const results: { player: IndexPlayer; score: number }[] = [];

  for (const player of PLAYERS_INDEX) {
    let score = 0;
    const normDisplayName = normalizeSearch(player.displayName);
    const normDisplayNameNoAl = stripAl(normDisplayName);
    const normName = normalizeSearch(player.name);
    const normId = normalizeSearch(player.id);

    // Exact match on display name or official name
    if (normDisplayName === normQuery || normName === normQuery || normId === normQuery) {
      score += 100;
    } else if (normDisplayNameNoAl === queryNoAl) {
      score += 98;
    } else if (normQuery.length >= 3) {
      if (normDisplayName.includes(normQuery) || normName.includes(normQuery)) {
        score += 70;
      } else if (normDisplayNameNoAl.includes(queryNoAl)) {
        score += 65;
      }
    }

    // Check aliases
    if (player.aliases) {
      for (const alias of player.aliases) {
        const normAlias = normalizeSearch(alias);
        const normAliasNoAl = stripAl(normAlias);

        if (normAlias === normQuery || normAliasNoAl === queryNoAl) {
          score += 95;
          break;
        } else if (normQuery.length >= 3 && normAlias.length >= 3) {
          if (normAlias.includes(normQuery) || normQuery.includes(normAlias)) {
            score += 55;
            break;
          }
        }
      }
    }

    // Secondary attribute (nationality)
    if (score >= 50 && normQuery.length >= 3) {
      if (normalizeSearch(player.nationality).includes(normQuery)) {
        score += 10;
      }
    }

    if (score >= 50) {
      results.push({ player, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.map((r) => r.player);
}
