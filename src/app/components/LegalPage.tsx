'use client';

import Link from 'next/link';
import { ArrowNarrowLeft, Notes } from '../icons';
import { useLocale } from '../locale';

type Translator = (arabic: string) => string;

/**
 * Privacy and terms are drafts, in the product's own voice: short sections,
 * no boilerplate. The copy is wrapped in t() where it is written so the i18n
 * gate can see every string, and the badge says out loud that a human still
 * has to read them.
 */
function privacySections(t: Translator): [string, string][] {
  return [
    [t('ما نجمعه'), t('الاسم والبريد اللذان تسجّل بهما، وكلمة مرور مشفّرة لا نراها ولا نستطيع قراءتها.')],
    [t('محتواك'), t('المهام والعادات والملاحظات وجلسات التركيز تُخزَّن في قاعدة بيانات حسابك وتظهر لك وحدك.')],
    [t('ملفات تعريف الارتباط'), t('ملف جلسة تسجيل الدخول فقط. لا تتبّع، ولا إعلانات، ولا أدوات تحليل طرف ثالث.')],
    [t('الحذف'), t('حذف الحساب من الإعدادات يحذف محتواه معه. لا نحتفظ بنسخة بعده.')],
    [t('التصدير'), t('يمكنك تنزيل كل بياناتك من الإعدادات في أي وقت، بصيغة تقرأها بأي أداة.')],
    [t('التواصل'), t('لأي طلب يخص بياناتك، راسل صاحب التطبيق عبر البريد المذكور في المستودع.')],
  ];
}

function termsSections(t: Translator): [string, string][] {
  return [
    [t('الاستخدام'), t('التطبيق أداة شخصية للتنظيم، يُقدَّم كما هو دون ضمان استمرار الخدمة.')],
    [t('الحساب'), t('أنت مسؤول عن كلمة مرورك وعن النشاط الذي يجري من حسابك.')],
    [t('المحتوى'), t('ما تكتبه يبقى ملكك. لا نطالب بأي حق عليه، ولا نعرضه على أحد.')],
    [t('الحدود'), t('لا نضمن ألّا تنقطع الخدمة أو تخلو من الأخطاء؛ خذ نسخة احتياطية من بياناتك متى شئت.')],
    [t('الإنهاء'), t('يمكنك حذف حسابك في أي وقت، ويمكن إيقاف الحساب عند إساءة الاستخدام.')],
    [t('التغييرات'), t('قد تتغيّر هذه الصفحة، وسيظهر تاريخ آخر تحديث أعلاها.')],
  ];
}

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t } = useLocale();
  const sections = kind === 'privacy' ? privacySections(t) : termsSections(t);

  return (
    <main className="legal-page" id="main-content">
      <Link className="legal-back" href="/">
        <ArrowNarrowLeft size={17} aria-hidden="true" />
        {t('العودة إلى التطبيق')}
      </Link>
      <header className="legal-head">
        <span className="legal-icon" aria-hidden="true"><Notes size={20} /></span>
        <h1>{kind === 'privacy' ? t('الخصوصية') : t('الشروط')}</h1>
        <p className="legal-meta">{t('آخر تحديث: 24 نوفمبر 2026')}</p>
        <p className="legal-badge">{t('مسوّدة — بانتظار مراجعتك')}</p>
      </header>

      <p className="legal-lead">
        {kind === 'privacy'
          ? t('هذه مساحة شخصية. لا نبيع بياناتك، ولا نستخدمها للإعلانات.')
          : t('باستخدامك التطبيق فإنك توافق على ما يلي. اقرأه، فهو قصير.')}
      </p>

      {sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}

      <p className="legal-note">{t('هذه الصفحة مسوّدة وليست نصيحة قانونية؛ راجعها قبل النشر.')}</p>
    </main>
  );
}
