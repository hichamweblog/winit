'use client';

/**
 * Shared modal focus management: focus trap, Escape, scroll lock, focus restore.
 *
 * Extracted from page.tsx so the confirmation dialog can use exactly the same
 * behaviour as every other modal.
 *
 * A module-level stack makes nested dialogs safe. A confirmation opened on top
 * of an editor registers a second document-level keydown listener; without the
 * stack, Escape would reach BOTH and close the editor underneath as well.
 * `stopPropagation` does not help here — listeners on the same node all run —
 * so instead only the topmost dialog is allowed to handle the key.
 */
import { useEffect, useRef } from 'react';

const stack: symbol[] = [];

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function useDialogFocus<T extends HTMLElement>(onEscape?: () => void) {
  const ref = useRef<T>(null);
  const escapeHandler = useRef(onEscape);
  escapeHandler.current = onEscape;

  useEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const token = Symbol('dialog');
    stack.push(token);
    const isTop = () => stack[stack.length - 1] === token;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusable = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((node) => node.offsetParent !== null || node === document.activeElement);
    // A dialog may nominate its own initial focus (e.g. Cancel on a destructive
    // confirmation, so Enter cannot delete by accident).
    const initial = panel.querySelector<HTMLElement>('[data-autofocus]');
    (initial ?? focusable()[0])?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (!isTop()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        escapeHandler.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) { event.preventDefault(); panel.focus(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      const index = stack.indexOf(token);
      if (index >= 0) stack.splice(index, 1);
      // Only the outermost dialog restores the page scroll; an inner one would
      // otherwise re-enable scrolling while the editor below is still open.
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return ref;
}
