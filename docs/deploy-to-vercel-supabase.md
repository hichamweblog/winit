# نشر Winit على Vercel مع Supabase PostgreSQL

تم تحويل قاعدة بيانات **Winit** بالكامل من SQLite إلى **PostgreSQL (Supabase)** ونشر التطبيق على **Vercel**.

---

## روابط المشروع الحالية (Live Links)

- **رابط تطبيق Vercel المباشر:** [https://winit-gray.vercel.app](https://winit-gray.vercel.app)
- **مشروع Supabase:** `winit` (Ref: `pyglcotzjpfspxzonzrh`, المنطقة: `eu-west-3 - باريس`)
- **لوحة تحكم Supabase:** [https://supabase.com/dashboard/project/pyglcotzjpfspxzonzrh](https://supabase.com/dashboard/project/pyglcotzjpfspxzonzrh)

---

## تم تطبيق الجداول بنجاح (Applied Tables)

تم تطبيق الـ Schema كاملة في Supabase بـ 10 جداول مهيأة ومفهرسة:
- `users`
- `workspaces`
- `memberships`
- `projects`
- `tasks`
- `habits`
- `habit_logs`
- `focus_sessions`
- `journal_entries`
- `sessions`

---

## الخطوة الأخيرة لتشغيل الـ Backend على Vercel

لربط خوادم Vercel Serverless مع قاعدة بيانات Supabase:

1. **تعيين كلمة مرور قاعدة البيانات في Supabase:**
   - افتح [Supabase Database Settings](https://supabase.com/dashboard/project/pyglcotzjpfspxzonzrh/settings/database).
   - تحت قسم **Database Password**، اضغط **Reset Password** وضع كلمة مرور قوية (واحفظها).

2. **نسخ رابط الاتصال (Connection String):**
   - في نفس الصفحة، توجه إلى **Connection String** واختر تبويب **Node.js** أو **Transaction Pooler** (المنفذ 6543):
   ```
   postgresql://postgres.pyglcotzjpfspxzonzrh:[YOUR-PASSWORD]@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
   ```

3. **إضافة المتغيرات في Vercel Dashboard:**
   - افتح [Vercel Environment Variables](https://vercel.com/hichamweblogs-projects/winit/settings/environment-variables).
   - أضف المتغيرات التالية:
     - `DATABASE_URL` = رابط الاتصال مع كلمة المرور التي اخترتها.
     - `WINIT_TRUST_PROXY` = `1`
     - `WINIT_PUBLIC_ORIGIN` = `https://winit-gray.vercel.app`
   - اضغط **Save** ثم اضغط **Redeploy** في Vercel.
