# نشر Winit على Render (Deploying Winit to Render)

يمكن نشر تطبيق **Winit** بسهولة على منصة [Render](https://render.com) باستخدام حاوية Docker المجهزة وقاعدة بيانات SQLite.

---

## الخيار الأول: النشر التلقائي عبر Render Blueprint (موصى به - خطة Starter)

تتطلب قاعدة بيانات SQLite قرصاً دائماً (Persistent Disk) للاحتفاظ بالبيانات والمهام بعد إعادة التشغيل، وهو مدعوم في خطة Starter ($7/شهر + $0.25 للقرص):

1. سجّل الدخول إلى [Render Dashboard](https://dashboard.render.com).
2. اضغط على **New +** ثم اختر **Blueprint**.
3. اربط مستودع GitHub الخاص بك: `hichamweblog/winit`.
4. سيكتشف Render ملف [`render.yaml`](../render.yaml) تلقائياً ويقوم بإعداد:
   - خدمة ويب مبنية على `Dockerfile`
   - قرص دائم `winit-data` بحجم 1GB مُثبّت على `/app/data`
   - فحص الصحة التلقائي على `/api/health`
5. اضغط على **Apply**.

---

## الخيار الثاني: النشر اليدوي / المجاني (Render Free Tier)

إذا كنت ترغب في تجربة التطبيق على الخطة المجانية (ملاحظة: الخطة المجانية في Render لا تدعم الأقراص الدائمة، وسيُعاد ضبط قاعدة البيانات عند إيقاف تشغيل الخادم بعد فترة خمول):

1. في لوحة تحكم Render، اضغط **New +** ثم **Web Service**.
2. اربط مستودع `hichamweblog/winit`.
3. اختر الإعدادات التالية:
   - **Language / Runtime:** `Docker`
   - **Instance Type:** `Free`
   - **Health Check Path:** `/api/health`
4. في قسم **Environment Variables**، أضف:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = `/app/data/winit.db`
   - `WINIT_TRUST_PROXY` = `1`
   - `PORT` = `3000`
5. اضغط **Create Web Service**.

---

## التوصيل مع CI/CD (GitHub Actions)

لتفعيل النشر التلقائي (Continuous Deployment) بمجرد نجاح جميع اختبارات وفحوصات CI:

1. في Render، انتقل إلى صفحة الخدمة الخاصة بك ثم **Settings**.
2. ابحث عن قسم **Deploy Hook** وانسخ الرابط (يبدو بالشكل: `https://api.render.com/deploy/srv-xxxx?key=yyyy`).
3. في مستودع GitHub (`hichamweblog/winit`):
   - انتقل إلى **Settings** -> **Secrets and variables** -> **Actions**.
   - اضغط **New repository secret**.
   - الاسم: `RENDER_DEPLOY_HOOK_URL`
   - القيمة: الصق رابط الـ Deploy Hook المنسوخ من Render.

بمجرد إضافة هذا السر، ستقوم خطوة `Deploy to Render` في GitHub Actions بتشغيل التحديث تلقائياً فور نجاح الفحص والاختبارات وبناء الحاوية.
