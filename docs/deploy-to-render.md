# نشر Winit على Render مع PostgreSQL

يعمل Winit حالياً على PostgreSQL عبر Drizzle ORM. بدأ المشروع على SQLite ثم انتقل إلى Supabase/PostgreSQL؛ لا تستخدم ملف SQLite أو قرص Render كقاعدة بيانات للتطبيق الحالي.

## النشر عبر Render Blueprint

1. أنشئ قاعدة PostgreSQL على Supabase أو مزوّد PostgreSQL آخر.
2. انسخ رابط اتصال PostgreSQL، ويفضّل رابط Transaction Pooler عند استخدام Supabase مع خدمة Render.
3. في Render، اختر **New +** ثم **Blueprint**، واربط المستودع `hichamweblog/winit`.
4. يقرأ Render [`render.yaml`](../render.yaml) ويطلب قيمة `DATABASE_URL`؛ أدخل رابط الاتصال واحفظه كسِر.
5. بعد إنشاء الخدمة، اضبط `WINIT_PUBLIC_ORIGIN` على النطاق العام الذي يعرضه Render.
6. طبّق ترحيلات قاعدة البيانات مرة واحدة بواسطة `npm run bootstrap` مع `DATABASE_URL` نفسه، ثم أعد نشر الخدمة.

الخطة المجانية قد توقف الخدمة عند الخمول، لكن بيانات PostgreSQL تبقى لدى مزوّد قاعدة البيانات، ولا تعتمد على قرص حاوية Render.

## النشر اليدوي

1. أنشئ خدمة **Web Service** من مستودع `hichamweblog/winit` واستخدم إعداد **Docker**.
2. عيّن `NODE_ENV=production` و`DATABASE_URL` إلى رابط PostgreSQL و`WINIT_TRUST_PROXY=1`.
3. بعد ظهور نطاق الخدمة، اضبط `WINIT_PUBLIC_ORIGIN` عليه.
4. طبّق الترحيلات بواسطة `npm run bootstrap` باستخدام اتصال قاعدة الإنتاج قبل استقبال الطلبات.

لا تستخدم أدوات `db:backup` أو `db:reset` أو `db:clean-demo` مع PostgreSQL؛ هذه الأدوات القديمة مخصصة لملفات SQLite. استخدم النسخ الاحتياطية والاستعادة التي يوفرها مزوّد PostgreSQL.

## التوصيل مع CI/CD (GitHub Actions)

1. في Render، انتقل إلى صفحة الخدمة ثم **Settings**.
2. انسخ **Deploy Hook**.
3. في إعدادات مستودع GitHub، أضف السر `RENDER_DEPLOY_HOOK_URL` وضع فيه رابط Deploy Hook.

بعد إضافة السر، يمكن لخطوة `Deploy to Render` في GitHub Actions تشغيل التحديث بعد نجاح الفحوصات والاختبارات وبناء الحاوية.
