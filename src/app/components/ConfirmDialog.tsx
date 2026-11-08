'use client';

/**
 * In-app confirmation dialog — replaces every `window.confirm` in the app.
 *
 * Why not the native dialog: it is unstyled, ignores RTL and the design tokens,
 * cannot be tested with Playwright's DOM assertions, and on mobile it renders a
 * browser chrome bar that looks nothing like the app.
 *
 * `useConfirm()` returns a promise so call sites stay as readable as the code
 * they replace:
 *
 *   if (!(await confirm({ title, message }))) return;
 *
 * Accessibility: `role="alertdialog"` with `aria-labelledby`/`aria-describedby`,
 * a focus trap, Escape and backdrop = cancel, and initial focus on **Cancel**
 * for destructive actions so a stray Enter cannot delete anything.
 */
import { useCallback, useRef, useState } from 'react';
import { AlertTriangle, Info, X } from '../icons';
import useDialogFocus from './useDialogFocus';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` colours the action red and focuses Cancel first. Default. */
  tone?: 'danger' | 'default';
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null);
  // Keeps the latest resolver reachable even if a second request arrives before
  // the first settles; the abandoned one resolves false rather than hanging.
  const abandoned = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    abandoned.current?.(false);
    abandoned.current = resolve;
    setPending({ ...options, resolve });
  }), []);

  const settle = useCallback((ok: boolean) => {
    setPending((current) => {
      if (current) { current.resolve(ok); abandoned.current = null; }
      return null;
    });
  }, []);

  const confirmDialog = pending
    ? <ConfirmDialog options={pending} onResult={settle} />
    : null;

  return { confirm, confirmDialog };
}

function ConfirmDialog({ options, onResult }: { options: Pending; onResult: (ok: boolean) => void }) {
  const { title, message, confirmLabel, cancelLabel, tone = 'danger' } = options;
  const dialogRef = useDialogFocus<HTMLDivElement>(() => onResult(false));
  const danger = tone === 'danger';

  return (
    <div
      className="modal-backdrop confirm-backdrop"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onResult(false); }}
    >
      <div
        ref={dialogRef}
        className="task-modal confirm-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        tabIndex={-1}
      >
        <div className="modal-topline">
          <span className={`modal-icon ${danger ? 'modal-icon-danger' : ''}`} aria-hidden="true">
            {danger ? <AlertTriangle size={17} /> : <Info size={17} />}
          </span>
          <span id="confirm-title">{title}</span>
          <button type="button" className="icon-button" onClick={() => onResult(false)} aria-label="إغلاق"><X size={18} /></button>
        </div>
        <p id="confirm-message" className="confirm-message" dir="auto">{message}</p>
        <div className="modal-footer confirm-footer">
          <button
            type="button"
            className="ghost-button"
            data-autofocus={danger ? '' : undefined}
            onClick={() => onResult(false)}
          >{cancelLabel ?? 'إلغاء'}</button>
          <button
            type="button"
            className={`primary-button ${danger ? 'danger-solid-button' : ''}`}
            data-autofocus={danger ? undefined : ''}
            onClick={() => onResult(true)}
          >{confirmLabel ?? (danger ? 'حذف' : 'تأكيد')}</button>
        </div>
      </div>
    </div>
  );
}
