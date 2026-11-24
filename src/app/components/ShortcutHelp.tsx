'use client';

/**
 * Keyboard shortcut reference.
 *
 * The app had exactly one global accelerator and no way to discover it; this is
 * the "?" sheet that makes the keyboard path visible instead of folklore.
 */
import { X } from '../icons';
import useDialogFocus from './useDialogFocus';
import { useLocale } from '../locale';

// i18n-exempt-start: label data, rendered through t()
const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['N'], label: 'مهمة جديدة' },
  { keys: ['Ctrl', 'K'], label: 'بحث في المهام' },
  { keys: ['Ctrl', 'Enter'], label: 'مهمة جديدة من أي مكان' },
  { keys: ['↑', '↓'], label: 'إعادة ترتيب مشروع أو عادة (على مقبض السحب)' },
  { keys: ['Esc'], label: 'إغلاق النافذة أو البحث' },
  { keys: ['?'], label: 'هذه القائمة' },
]; // i18n-exempt-end

export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  return (
    <div
      className="modal-backdrop confirm-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="task-modal shortcut-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-title"
        tabIndex={-1}
      >
        <div className="modal-topline">
          <span id="shortcut-title">{t('اختصارات لوحة المفاتيح')}</span>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t('إغلاق')}><X size={18} /></button>
        </div>
        <dl className="shortcut-list">
          {SHORTCUTS.map((shortcut) => (
            <div className="shortcut-row" key={shortcut.label}>
              <dt>{t(shortcut.label)}</dt>
              <dd>
                {shortcut.keys.map((key) => <kbd key={key} dir="ltr">{key}</kbd>)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="shortcut-note">{t('تعمل الاختصارات خارج حقول الكتابة والنوافذ المفتوحة.')}</p>
      </div>
    </div>
  );
}

export default ShortcutHelp;
