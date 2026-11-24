# لعبة مين اللاعب؟ ⚽🎮

لعبة تحدي كروية جماعية مصرية ممتعة، بتجمع بين الأصدقاء لتخمين لاعبي كرة القدم المشهورين من خلال أسئلة ذكية ونظام نقاط عادل.

---

## 🚀 التشغيل المحلي والتطوير

1. **تثبيت الاعتماديات:**
   ```bash
   npm install
   ```

2. **تشغيل سيرفر التطوير (Dev Server):**
   ```bash
   npm run dev
   ```
   التطبيق هيشتغل على المنفذ `3000`: `http://localhost:3000`.

---

## 📦 البناء والإنتاج (Production)

1. **بناء المشروع:**
   ```bash
   npm run build
   ```

2. **تشغيل سيرفر الإنتاج:**
   ```bash
   npm start
   ```

---

## ⚙️ المتغيرات البيئية (Environment Variables)

انسخ ملف `.env.example` لـ `.env` وظبط القيم:
- `GROQ_API_KEY`: مفتاح Groq API المجاني (المزوّد الأساسي للبحث وملفات اللاعبين ومساعد الجولة).
- `GROQ_MODEL`: موديل Groq الافتراضي (`openai/gpt-oss-120b` والاحتياطي `openai/gpt-oss-20b`).
- `GEMINI_API_KEY`: مفتاح واجهة برمجة Gemini (المزوّد الاحتياطي).
- `GEMINI_MODELS`: موديلات Gemini بالترتيب الافتراضي (`gemini-3.1-flash-lite,gemini-3.8-flash`).
- `PORT`: المنفذ (افتراضي `3000`).

---

## ⚠️ متطلبات الاستضافة والنشر (Full-Stack App)

- **التطبيق ده Full-stack (React + Express Server)**:
- **ممنوع** نشره كـ Static Site على GitHub Pages أو Cloudflare Pages العادية.
- محتاج بيئة استضافة تدعم Node.js وسيرفر شغال (زي Google Cloud Run أو Render أو Railway أو VPS).

---

## 🩺 فحص صحة السيرفر (Health Check)

تقدر تفحص حالة السيرفر، جاهزية الموديلات، وعدد اللاعبين في القاعدة والفهرس عن طريق:
```
GET /api/health
```

---

## 🧪 تشغيل الاختبارات الآلية (Automated Tests)

المشروع مزود باختبارات وحدة آلية مبنية بـ Vitest لتأكيد سلامة الحسابات وقواعد اللعبة:
```bash
npm test
```
