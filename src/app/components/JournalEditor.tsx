'use client';

import { useState } from 'react';
import type { JournalEntry, JournalMood } from '@/lib/types';
import type { JournalInput } from '../types';
import { journalMoods } from '../types';
import { NotebookPen, X } from '../icons';
import { formatArNumber } from '@/lib/core';
import { useConfirm } from './ConfirmDialog';
import useDialogFocus from './useDialogFocus';

export type JournalEditorProps = {
  entry: JournalEntry | null;
  today: string;
  busy: boolean;
  onClose: () => void;
  onSave: (input: JournalInput, entryId?: string) => void;
};

export function JournalEditor({ entry, today, busy, onClose, onSave }: JournalEditorProps) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [entryDate, setEntryDate] = useState(entry?.entryDate ?? today);
  const [mood, setMood] = useState<JournalMood | null>(entry?.mood ?? null);

  const dirty =
    title !== (entry?.title ?? '') ||
    content !== (entry?.content ?? '') ||
    entryDate !== (entry?.entryDate ?? today) ||
    mood !== (entry?.mood ?? null);

  const { confirm, confirmDialog } = useConfirm();

  const requestClose = async () => {
    if (busy) return;
    if (dirty) {
      const discard = await confirm({
        title: 'تغييرات غير محفوظة',
        message: 'لديك تغييرات لم تُحفظ في هذه التدوينة. إن أغلقت المحرر الآن ستفقد ما كتبته.',
        confirmLabel: 'أغلق دون حفظ',
        cancelLabel: 'تابع التحرير',
      });
      if (!discard) return;
    }
    onClose();
  };

  const close = () => {
    void requestClose();
  };

  const dialogRef = useDialogFocus<HTMLFormElement>(close);

  return (
    <div
      className="modal-backdrop journal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        ref={dialogRef}
        className="task-modal journal-editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-editor-heading"
        onSubmit={(event) => {
          event.preventDefault();
          if (!content.trim()) return;
          onSave({ entryDate, title: title.trim() || null, content, mood }, entry?.id);
        }}
      >
        <div className="modal-topline">
          <span className="modal-icon">
            <NotebookPen size={17} />
          </span>
          <span id="journal-editor-heading">{entry ? 'تعديل التدوينة' : 'تدوينة جديدة'}</span>
          <button type="button" className="icon-button" onClick={close} aria-label="إغلاق المحرر" disabled={busy}>
            <X size={18} />
          </button>
        </div>
        <label className="journal-field-label" htmlFor="journal-title">
          عنوان اختياري
        </label>
        <input
          id="journal-title"
          className="journal-title-input"
          dir="auto"
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          placeholder="كلمة تلخّص يومك"
        />
        <div className="journal-date-field">
          <label className="journal-field-label" htmlFor="journal-date">
            تاريخ التدوينة
          </label>
          <input
            id="journal-date"
            type="date"
            required
            value={entryDate}
            onChange={(event) => setEntryDate(event.target.value)}
          />
        </div>
        <fieldset className="journal-mood-field">
          <legend>
            كيف كان شعورك؟ <span>اختياري</span>
          </legend>
          <div className="journal-mood-options">
            {journalMoods.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`journal-mood-option ${mood === option.id ? 'mood-selected' : ''}`}
                aria-pressed={mood === option.id}
                onClick={() => setMood(mood === option.id ? null : option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="journal-field-label" htmlFor="journal-content">
          ما الذي تود تدوينه؟
        </label>
        <textarea
          id="journal-content"
          className="journal-content-input"
          dir="auto"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={20000}
          required
          placeholder="اكتب بحرية. لا تحتاج إلى صياغة مثالية…"
        />
        <div className="journal-editor-foot">
          <span>
            {formatArNumber(content.length)} / {formatArNumber(20000)} حرف
          </span>
          <button className="primary-button" type="submit" disabled={busy || !content.trim()}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ التدوينة'}
          </button>
        </div>
      </form>
      {confirmDialog}
    </div>
  );
}

export default JournalEditor;
