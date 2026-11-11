'use client';

import { useState } from 'react';
import type { JournalEntry, JournalMood } from '@/lib/types';
import { journalMoods } from '../types';
import { NotebookPen, Pencil, Plus, Search, Trash2 } from '../icons';
import { RowActions } from './atoms';
import { AR_LOCALE, formatArNumber } from '@/lib/core';

export type JournalViewProps = {
  entries: JournalEntry[];
  total: number;
  search: string;
  loading: boolean;
  onSearch: (value: string) => void;
  onNew: () => void;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (id: string) => void;
  onLoadMore: () => void;
};

export function JournalView({
  entries,
  total,
  search,
  loading,
  onSearch,
  onNew,
  onEdit,
  onDelete,
  onLoadMore,
}: JournalViewProps) {
  // §8.9: the reading card is the only place Naskh is allowed, at 18px or 20px.
  const [readingSize, setReadingSize] = useState<'normal' | 'large'>('normal');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const dateLabel = (value: string) =>
    new Intl.DateTimeFormat(AR_LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(
      new Date(`${value}T12:00:00`)
    );

  const moodLabel = (value: JournalMood | null) => journalMoods.find((mood) => mood.id === value)?.label;

  return (
    <section className="list-page journal-page" aria-labelledby="journal-heading">
      <div className="page-title-row journal-title-row">
        <div>
          <h1 id="journal-heading">دفتر اليوميات</h1>
          <p>اكتب ما تريد تذكّره، بلا ضغط ولا قالب مفروض.</p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <NotebookPen size={17} />
          تدوينة جديدة
        </button>
      </div>

      <div className="journal-prompt">
        <div>
          <span>سؤال اليوم</span>
          <h2>ما الشيء الذي تود أن تحتفظ به من هذا اليوم؟</h2>
          <p>سطر واحد يكفي. يمكنك العودة إليه متى شئت.</p>
        </div>
        <button className="journal-prompt-action" onClick={onNew}>
          ابدأ الكتابة <Pencil size={15} />
        </button>
      </div>


      <div className="journal-toolbar">
        <span className="journal-count">
          {formatArNumber(total)} {total === 1 ? 'تدوينة' : 'تدوينات'}
        </span>
        <button
          className="ghost-button"
          onClick={() => setReadingSize((size) => (size === 'normal' ? 'large' : 'normal'))}
          aria-pressed={readingSize === 'large'}
        >
          {readingSize === 'normal' ? 'تكبير خط القراءة' : 'تصغير خط القراءة'}
        </button>
        <label className="journal-search">
          <Search size={17} />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="ابحث في تدويناتك"
            aria-label="ابحث في التدوينات"
          />
        </label>
      </div>

      {loading && !entries.length ? (
        <div className="journal-loading" role="status" aria-live="polite" aria-label="جارٍ تحميل اليوميات">
          <div />
          <div />
          <div />
        </div>
      ) : entries.length ? (
        <div className="journal-list" aria-busy={loading}>
          {entries.map((entry) => (
            <article
              className="journal-entry reading-card row-interactive"
              key={entry.id}
              data-expanded={Boolean(expanded[entry.id])}
            >
              <div className="journal-entry-head">
                <div>
                  <time dateTime={entry.entryDate}>{dateLabel(entry.entryDate)}</time>
                  <h2>
                    <bdi>{entry.title || 'تدوينة يومية'}</bdi>
                  </h2>
                </div>
                {moodLabel(entry.mood) && <span className={`journal-mood mood-${entry.mood}`}>{moodLabel(entry.mood)}</span>}
              </div>
              <div className="reading-card__body reading-body" data-size={readingSize} dir="auto">
                {entry.content}
              </div>
              {entry.content.length > 320 && (
                <button
                  className="ghost-button"
                  onClick={() => setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                  aria-expanded={Boolean(expanded[entry.id])}
                >
                  {expanded[entry.id] ? 'عرض أقل' : 'اقرأ المزيد'}
                </button>
              )}
              <div className="journal-entry-foot">
                <span>
                  آخر تعديل{' '}
                  {new Intl.DateTimeFormat(AR_LOCALE, { hour: 'numeric', minute: '2-digit' }).format(
                    new Date(entry.updatedAt)
                  )}
                </span>
                <RowActions>
                  <button
                    className="icon-button row-action"
                    onClick={() => onEdit(entry)}
                    aria-label={`تعديل تدوينة ${entry.title}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-button row-action row-action-danger"
                    onClick={() => onDelete(entry.id)}
                    aria-label={`حذف تدوينة ${dateLabel(entry.entryDate)}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </RowActions>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-page journal-empty">
          <span className="journal-empty-icon">
            <NotebookPen size={22} />
          </span>
          <h3>{search ? 'لم نعثر على تدوينة مطابقة' : 'دفترك ما زال فارغاً'}</h3>
          <p>
            {search
              ? 'جرّب كلمات أخرى أو امسح البحث.'
              : 'ابدأ بملاحظة صغيرة عن يومك، ثم عُد إليها وقتما تشاء.'}
          </p>
          {!search && (
            <button className="primary-button" onClick={onNew}>
              <Plus size={16} />
              اكتب أول تدوينة
            </button>
          )}
        </div>
      )}

      {entries.length < total && (
        <button className="journal-load-more" onClick={onLoadMore} disabled={loading}>
          {loading ? 'جارٍ التحميل…' : 'تحميل تدوينات أقدم'}
        </button>
      )}
    </section>
  );
}

export default JournalView;
