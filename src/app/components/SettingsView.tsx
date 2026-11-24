'use client';

/**
 * Settings — every app preference in one place.
 *
 * Previously the mobile-bar customiser was a modal behind a sidebar link and the
 * pomodoro length lived only inside the focus dialog. Both are here now, with
 * the theme and the account, so there is a single answer to "where do I change
 * this?". Changes apply immediately; there is no save button to forget.
 */
import { useState } from 'react';
import { useAuth } from './AuthGate';
import { useLocale } from '../locale';
import PwaInstall from './PwaInstall';
import {
  Check, DeviceMobile, Download, Languages, ListTodo, Logout, Moon, Stopwatch, Sun, Trash, User,
} from '../icons';
import type { AppIcon } from '../icons';
import { formatArNumber } from '@/lib/core';

export type SettingsViewOption = { id: string; label: string; icon: AppIcon };

const POMODORO_PRESETS = [15, 25, 45, 60];
const MAX_MOBILE_VIEWS = 4;

function SettingRow({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <span className="setting-icon" aria-hidden="true">{icon}</span>
      <div className="setting-copy">
        <b>{title}</b>
        {description && <span>{description}</span>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  );
}

export default function SettingsView({
  darkMode, onToggleTheme, pomodoroMinutes, onPomodoroChange,
  mobileViews, mobileViewOptions, onMobileViewsChange,
  density, onDensityChange,
  onExportData, onDeleteAccount,
}: {
  darkMode: boolean; onToggleTheme: () => void;
  pomodoroMinutes: number; onPomodoroChange: (minutes: number) => void;
  mobileViews: string[]; mobileViewOptions: SettingsViewOption[];
  onMobileViewsChange: (next: string[]) => void;
  density: 'comfortable' | 'compact'; onDensityChange: (next: 'comfortable' | 'compact') => void;
  onExportData?: () => void;
  onDeleteAccount?: () => void;
}) {
  const { user, signOut } = useAuth();
  const { language, setLanguage, t } = useLocale();
  const [signingOut, setSigningOut] = useState(false);

  const toggleView = (id: string, checked: boolean) => {
    const next = checked ? [...mobileViews, id] : mobileViews.filter((value) => value !== id);
    if (next.length >= 1 && next.length <= MAX_MOBILE_VIEWS) onMobileViewsChange(next);
  };

  return (
    <section className="settings-page">
      <div className="page-title-row">
        <div>
          <h1>{t('الإعدادات')}</h1>
          <p>{t('كل تفضيلات التطبيق في مكان واحد. التغييرات تُحفظ فورًا.')}</p>
        </div>
      </div>

      <section className="panel settings-group" aria-labelledby="settings-language">
        <h2 id="settings-language">{t('اللغة')}</h2>
        <SettingRow icon={<Languages size={17} />} title={t('إعدادات اللغة')} description={t('اختر لغة واجهة التطبيق.')}>
          <div className="segmented-control" role="group" aria-label={t('إعدادات اللغة')}>
            <button type="button" className={language === 'ar' ? 'segment-active' : ''} aria-pressed={language === 'ar'} onClick={() => setLanguage('ar')}>{t('العربية')}</button>
            <button type="button" className={language === 'en' ? 'segment-active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
          </div>
        </SettingRow>
      </section>

      <section className="panel settings-group" aria-labelledby="settings-install">
        <h2 id="settings-install">{t('التطبيق')}</h2>
        <PwaInstall />
      </section>

      <section className="panel settings-group" aria-labelledby="settings-appearance">
        <h2 id="settings-appearance">{t('المظهر')}</h2>
        <SettingRow
          icon={darkMode ? <Moon size={17} /> : <Sun size={17} />}
          title={t('المظهر الداكن')}
          description={t('يتبع تفضيل نظامك عند أول زيارة، ثم يحفظ اختيارك.')}
        >
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={darkMode}
            aria-label={t('المظهر الداكن')}
            onClick={onToggleTheme}
          ><i /></button>
        </SettingRow>
        <SettingRow
          icon={<ListTodo size={17} />}
          title={t('كثافة القائمة')}
          description={t('«مريحة» تعطي كل مهمة مساحة أكبر، و«كثيفة» تعرض مهام أكثر في الشاشة.')}
        >
          <div className="segmented-control density-control" role="group" aria-label={t('كثافة القائمة')}>
            <button type="button" className={density === 'comfortable' ? 'segment-active' : ''} aria-pressed={density === 'comfortable'} onClick={() => onDensityChange('comfortable')}>{t('مريحة')}</button>
            <button type="button" className={density === 'compact' ? 'segment-active' : ''} aria-pressed={density === 'compact'} onClick={() => onDensityChange('compact')}>{t('كثيفة')}</button>
          </div>
        </SettingRow>
      </section>

      <section className="panel settings-group" aria-labelledby="settings-focus">
        <h2 id="settings-focus">{t('التركيز')}</h2>
        <SettingRow
          icon={<Stopwatch size={17} />}
          title={t('مدة جلسة التركيز')}
          description={t('المدة الافتراضية عند بدء جلسة بومودورو.')}
        >
          <div className="segmented-control" role="group" aria-label={t('مدة جلسة التركيز بالدقائق')}>
            {POMODORO_PRESETS.map((minutes) => (
              <button
                key={minutes}
                className={pomodoroMinutes === minutes ? 'segment-active' : ''}
                aria-pressed={pomodoroMinutes === minutes}
                aria-label={t('{count} دقيقة', { count: minutes })}
                onClick={() => onPomodoroChange(minutes)}
              ><bdi>{formatArNumber(minutes)}</bdi></button>
            ))}
          </div>
        </SettingRow>
        {!POMODORO_PRESETS.includes(pomodoroMinutes) && (
          <p className="setting-note">{t('المدة الحالية')} <bdi>{formatArNumber(pomodoroMinutes)}</bdi> {t('دقيقة. اختر إحدى المدد أعلاه لتغييرها.')}</p>
        )}
      </section>

      <section className="panel settings-group" aria-labelledby="settings-nav">
        <h2 id="settings-nav"><DeviceMobile size={16} />{t('شريط الهاتف')}</h2>
        <p className="settings-helper">{t('اختر حتى أربعة أقسام تظهر بجانب «المزيد» في أسفل الشاشة.')}</p>
        <fieldset className="nav-choice-grid">
          <legend className="sr-only">{t('أقسام شريط الهاتف')}</legend>
          {mobileViewOptions.map((item) => {
            const Icon = item.icon;
            const checked = mobileViews.includes(item.id);
            const locked = !checked && mobileViews.length >= MAX_MOBILE_VIEWS;
            const lastOne = checked && mobileViews.length === 1;
            return (
              <label key={item.id} className={`nav-choice ${checked ? 'nav-choice-active' : ''}`} data-disabled={locked || lastOne ? 'true' : undefined}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked || lastOne}
                  onChange={(event) => toggleView(item.id, event.target.checked)}
                />
                <Icon size={17} />
                <span>{t(item.label)}</span>
                <i aria-hidden="true">{checked ? <Check size={14} /> : null}</i>
              </label>
            );
          })}
        </fieldset>
        <p className="setting-note" aria-live="polite"><bdi>{formatArNumber(mobileViews.length)}</bdi> / {formatArNumber(MAX_MOBILE_VIEWS)} {t('أقسام')}</p>
      </section>

      <section className="panel settings-group" aria-labelledby="settings-account">
        <h2 id="settings-account"><User size={16} />{t('الحساب')}</h2>
        {user ? (
          <>
            <SettingRow icon={<User size={17} />} title={user.name || user.email} description={user.demo ? t('مساحة تجريبية مشتركة — البيانات غير خاصة.') : user.email}>
              <span className="account-badge">{user.demo ? t('تجريبي') : t('خاص')}</span>
            </SettingRow>
            {!user.demo && (
              <SettingRow icon={<Logout size={17} />} title={t('تسجيل الخروج')} description={t('سيُطلب منك تسجيل الدخول في المرة القادمة.')}>
                <button
                  className="danger-button"
                  disabled={signingOut}
                  onClick={async () => { setSigningOut(true); try { await signOut(); } finally { setSigningOut(false); } }}
                >{signingOut ? t('جارٍ الخروج…') : t('تسجيل الخروج')}</button>
              </SettingRow>
            )}
            {!user.demo && onExportData && (
              <SettingRow icon={<Download size={17} />} title={t('تصدير البيانات')} description={t('تنزيل نسخة كاملة من بياناتك بصيغة JSON (متوافق مع GDPR).')}>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={onExportData}
                >{t('تصدير JSON')}</button>
              </SettingRow>
            )}
            {!user.demo && onDeleteAccount && (
              <SettingRow icon={<Trash size={17} />} title={t('حذف الحساب')} description={t('حذف حسابك نهائياً وكافة بياناتك ومساحتك دون إمكانية استرجاع.') }>
                <button
                  type="button"
                  className="danger-button"
                  onClick={onDeleteAccount}
                >{t('حذف الحساب')}</button>
              </SettingRow>
            )}
          </>
        ) : <p className="panel-empty">{t('لا توجد جلسة نشطة.')}</p>}
      </section>
    </section>
  );
}
