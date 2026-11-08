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
import {
  Check, DeviceMobile, Download, Logout, Moon, Stopwatch, Sun, Trash, User,
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
  onExportData, onDeleteAccount,
}: {
  darkMode: boolean; onToggleTheme: () => void;
  pomodoroMinutes: number; onPomodoroChange: (minutes: number) => void;
  mobileViews: string[]; mobileViewOptions: SettingsViewOption[];
  onMobileViewsChange: (next: string[]) => void;
  onExportData?: () => void;
  onDeleteAccount?: () => void;
}) {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const toggleView = (id: string, checked: boolean) => {
    const next = checked ? [...mobileViews, id] : mobileViews.filter((value) => value !== id);
    if (next.length >= 1 && next.length <= MAX_MOBILE_VIEWS) onMobileViewsChange(next);
  };

  return (
    <section className="settings-page">
      <div className="page-title-row">
        <div>
          <h1>الإعدادات</h1>
          <p>كل تفضيلات التطبيق في مكان واحد. التغييرات تُحفظ فورًا.</p>
        </div>
      </div>

      <section className="panel settings-group" aria-labelledby="settings-appearance">
        <h2 id="settings-appearance">المظهر</h2>
        <SettingRow
          icon={darkMode ? <Moon size={17} /> : <Sun size={17} />}
          title="المظهر الداكن"
          description="يتبع تفضيل نظامك عند أول زيارة، ثم يحفظ اختيارك."
        >
          <button
            type="button"
            className="switch"
            role="switch"
            aria-checked={darkMode}
            aria-label="المظهر الداكن"
            onClick={onToggleTheme}
          ><i /></button>
        </SettingRow>
      </section>

      <section className="panel settings-group" aria-labelledby="settings-focus">
        <h2 id="settings-focus">التركيز</h2>
        <SettingRow
          icon={<Stopwatch size={17} />}
          title="مدة جلسة التركيز"
          description="المدة الافتراضية عند بدء جلسة بومودورو."
        >
          <div className="segmented-control" role="group" aria-label="مدة جلسة التركيز بالدقائق">
            {POMODORO_PRESETS.map((minutes) => (
              <button
                key={minutes}
                className={pomodoroMinutes === minutes ? 'segment-active' : ''}
                aria-pressed={pomodoroMinutes === minutes}
                aria-label={`${minutes} دقيقة`}
                onClick={() => onPomodoroChange(minutes)}
              ><bdi>{formatArNumber(minutes)}</bdi></button>
            ))}
          </div>
        </SettingRow>
        {!POMODORO_PRESETS.includes(pomodoroMinutes) && (
          <p className="setting-note">المدة الحالية <bdi>{formatArNumber(pomodoroMinutes)}</bdi> دقيقة. اختر إحدى المدد أعلاه لتغييرها.</p>
        )}
      </section>

      <section className="panel settings-group" aria-labelledby="settings-nav">
        <h2 id="settings-nav"><DeviceMobile size={16} />شريط الهاتف</h2>
        <p className="settings-helper">اختر حتى أربعة أقسام تظهر بجانب «المزيد» في أسفل الشاشة.</p>
        <fieldset className="nav-choice-grid">
          <legend className="sr-only">أقسام شريط الهاتف</legend>
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
                <span>{item.label}</span>
                <i aria-hidden="true">{checked ? <Check size={14} /> : null}</i>
              </label>
            );
          })}
        </fieldset>
        <p className="setting-note" aria-live="polite"><bdi>{formatArNumber(mobileViews.length)}</bdi> / {formatArNumber(MAX_MOBILE_VIEWS)} أقسام</p>
      </section>

      <section className="panel settings-group" aria-labelledby="settings-account">
        <h2 id="settings-account"><User size={16} />الحساب</h2>
        {user ? (
          <>
            <SettingRow icon={<User size={17} />} title={user.name || user.email} description={user.demo ? 'مساحة تجريبية مشتركة — البيانات غير خاصة.' : user.email}>
              <span className="account-badge">{user.demo ? 'تجريبي' : 'خاص'}</span>
            </SettingRow>
            {!user.demo && (
              <SettingRow icon={<Logout size={17} />} title="تسجيل الخروج" description="سيُطلب منك تسجيل الدخول في المرة القادمة.">
                <button
                  className="ghost-button danger-button"
                  disabled={signingOut}
                  onClick={async () => { setSigningOut(true); try { await signOut(); } finally { setSigningOut(false); } }}
                >{signingOut ? 'جارٍ الخروج…' : 'خروج'}</button>
              </SettingRow>
            )}
            {!user.demo && onExportData && (
              <SettingRow icon={<Download size={17} />} title="تصدير البيانات" description="تنزيل نسخة كاملة من بياناتك بصيغة JSON (متوافق مع GDPR).">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={onExportData}
                >تصدير JSON</button>
              </SettingRow>
            )}
            {!user.demo && onDeleteAccount && (
              <SettingRow icon={<Trash size={17} />} title="حذف الحساب" description="حذف حسابك نهائياً وكافة بياناتك ومساحتك دون إمكانية استرجاع.">
                <button
                  type="button"
                  className="ghost-button danger-button"
                  onClick={onDeleteAccount}
                >حذف الحساب</button>
              </SettingRow>
            )}
          </>
        ) : <p className="panel-empty">لا توجد جلسة نشطة.</p>}
      </section>
    </section>
  );
}
