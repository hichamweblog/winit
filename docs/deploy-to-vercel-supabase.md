# نشر Winit على Vercel مع Supabase PostgreSQL

بدأ Winit باستخدام SQLite، ثم انتقل إلى PostgreSQL على Supabase. PostgreSQL هو المحرك الحالي، ويستخدم التطبيق Drizzle ORM وترحيلات SQL المودعة في المستودع.

## المشروع الحالي

- **تطبيق Vercel:** [https://winit-dz.vercel.app](https://winit-dz.vercel.app)
- **مشروع Supabase:** `winit` (Ref: `pyglcotzjpfspxzonzrh`، المنطقة: `eu-west-3 - باريس`)
- **لوحة Supabase:** [https://supabase.com/dashboard/project/pyglcotzjpfspxzonzrh](https://supabase.com/dashboard/project/pyglcotzjpfspxzonzrh)

## إعداد قاعدة البيانات والنشر

1. أنشئ مشروع PostgreSQL على Supabase أو استخدم المشروع الحالي.
2. من إعدادات قاعدة البيانات، انسخ رابط الاتصال المناسب لتطبيق Node.js. مع Vercel Serverless، استخدم رابط Transaction Pooler الموصى به من Supabase، عادةً على المنفذ `6543`، مع `prepare: false` في اتصال التطبيق.
3. أضف المتغيرات التالية إلى إعدادات المشروع في Vercel:
   - `DATABASE_URL`: رابط PostgreSQL الكامل. شفّر الأحرف الخاصة في كلمة المرور عند الحاجة.
   - `WINIT_TRUST_PROXY`: `1`.
   - `WINIT_PUBLIC_ORIGIN`: `https://winit-dz.vercel.app` أو نطاقك العام.
4. طبّق ترحيلات المستودع على قاعدة البيانات باستخدام `npm run bootstrap` مع `DATABASE_URL` نفسه قبل استقبال الطلبات.
5. أعد نشر التطبيق بعد ضبط المتغيرات.

قالب الاتصال يكون على الصورة التالية؛ استخدم القيم التي يعرضها Supabase ولا تحفظ كلمة المرور في المستودع:

```text
postgresql://postgres.<PROJECT-REF>:<PASSWORD>@<POOLER-HOST>:6543/postgres
```

يحتوي مجلد `drizzle/` على الترحيلات المصدرية للمخطط. لا تنشئ الجداول يدوياً ولا تستخدم أوامر SQLite؛ طبّق الترحيلات المودعة بواسطة `npm run bootstrap`. هذا يهيئ المخطط ولا يستورد تلقائياً أي بيانات قديمة من SQLite.

## النسخ الاحتياطي

استخدم النسخ الاحتياطية والاستعادة التي يوفرها Supabase/PostgreSQL، وتحقق من خطة الاحتفاظ والاستعادة لمشروعك. أدوات `db:backup` و`db:reset` و`db:clean-demo` الموجودة في المشروع تخص ملفات SQLite القديمة ولا تعمل مع قاعدة PostgreSQL الحالية.
