# نشر Winit على Vercel مع Supabase PostgreSQL

تم تحويل قاعدة بيانات **Winit** بالكامل من SQLite إلى **PostgreSQL (Supabase)** ونشر التطبيق على **Vercel**.

---

## روابط المشروع الحالية (Live Links)

- **رابط تطبيق Vercel المباشر:** [https://winit-dz.vercel.app](https://winit-dz.vercel.app)
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
     - `WINIT_PUBLIC_ORIGIN` = `https://winit-dz.vercel.app`
   - اضغط **Save** ثم اضغط **Redeploy** في Vercel.

---

## ملاحظة حول قيود المفاتيح الأجنبية (Foreign Keys) عند الحذف

إذا تم إنشاء الجداول يدوياً أو عبر واجهة Supabase، تأكد من أن قيود المفاتيح الأجنبية تسمح بالحذف دون أخطاء (SET NULL / CASCADE):

```sql
-- تأكيد فك ارتباط جلسات التركيز تلقائياً عند حذف المهمة
ALTER TABLE "focus_sessions" DROP CONSTRAINT IF EXISTS "focus_sessions_task_id_tasks_id_fk";
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_task_id_tasks_id_fk"
  FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- تأكيد فك ارتباط جلسات التركيز عند حذف المشروع
ALTER TABLE "focus_sessions" DROP CONSTRAINT IF EXISTS "focus_sessions_project_id_projects_id_fk";
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- تأكيد حذف المهام الفرعية تلقائياً عند حذف المهمة الأصلية
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_parent_task_id_tasks_id_fk";
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk"
  FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
```

*(تطبيق Winit في الكود يعالج هذا الأمر برمجياً أيضاً داخل Transaction لضمان الحذف السلس حتى لو كان القيد صارماً في قاعدة البيانات).*

