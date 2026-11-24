'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Project, Task } from '@/lib/types';
import { Check, Plus, Timer, Trash2, X } from '../icons';
import { TaskRow } from './TaskRow';
import { CountBadge } from './atoms';
import { AR_LOCALE, formatArNumber, formatDuration, PRIORITY_ORDER } from '@/lib/core';
import { tasksLabel } from '@/lib/semantics';
import { useLocale } from '../locale';

export type TaskListViewProps = {
  title: string;
  tasks: Task[];
  projects: Project[];
  project?: Project;
  today: string;
  query?: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onStart: (id: string) => void;
  onEdit: (task: Task) => void;
  onAdd: () => void;
  onBulkComplete: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkMove: (ids: string[], projectId: string | null) => void;
};

type StatusFilter = 'open' | 'all' | 'done';
type PriorityFilter = 'any' | 'high' | 'medium' | 'low' | 'none';

export function TaskListView({
  title,
  tasks,
  projects,
  project,
  today,
  query = '',
  onComplete,
  onDelete,
  onStart,
  onEdit,
  onAdd,
  onBulkComplete,
  onBulkDelete,
  onBulkMove,
}: TaskListViewProps) {
  const { language, t } = useLocale();
  const [listMode, setListMode] = useState<'combined' | 'separate'>('separate');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [priority, setPriority] = useState<PriorityFilter>('any');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!project) { setListMode('separate'); return; }
    try {
      setListMode(window.localStorage.getItem(`winit-project-list-mode:${project.id}`) === 'combined' ? 'combined' : 'separate');
    } catch { setListMode('separate'); }
  }, [project?.id]);

  // Leaving selection mode (or the page) must not leave ids checked behind.
  useEffect(() => { setSelected(new Set()); }, [status, priority, query, project?.id, selecting]);

  const changeListMode = (next: 'combined' | 'separate') => {
    setListMode(next);
    if (project) {
      try { window.localStorage.setItem(`winit-project-list-mode:${project.id}`, next); } catch { /* keep current view */ }
    }
  };
  const currentProject = (id: string | null) => projects.find((item) => item.id === id);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (status === 'open' && task.status === 'completed') return false;
      if (status === 'done' && task.status !== 'completed') return false;
      if (priority !== 'any' && task.priority !== priority) return false;
      if (!needle) return true;
      return (
        task.title.toLowerCase().includes(needle) ||
        (task.notes ?? '').toLowerCase().includes(needle) ||
        (currentProject(task.projectId)?.name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [tasks, status, priority, query, projects]);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    const sorted = [...filtered].sort((a, b) => {
      const aDone = a.status === 'completed' ? 1 : 0;
      const bDone = b.status === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      const dateCmp = (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31');
      if (dateCmp !== 0) return dateCmp;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });

    for (const task of sorted) {
      const key =
        task.dueDate && task.dueDate < today
          ? t('متأخرة')
          : task.dueDate === today
          ? t('اليوم')
          : task.dueDate
          ? new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : AR_LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(
              new Date(`${task.dueDate}T12:00:00`)
            )
          : t('بلا موعد');
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [filtered, today, language]);

  const visibleGroups = project && listMode === 'combined' && !query && status === 'open' && priority === 'any'
    ? new Map([[t('كل المهام'), [...groups.values()].flat()]])
    : groups;

  const openCount = tasks.filter((task) => task.status !== 'completed').length;
  const filteredCount = filtered.length;
  const filtersActive = status !== 'open' || priority !== 'any' || query.trim().length > 0;
  const selectedIds = [...selected];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearFilters = () => { setStatus('open'); setPriority('any'); };

  const statusOptions: { id: StatusFilter; label: string }[] = [
    { id: 'open', label: t('مفتوحة') },
    { id: 'all', label: t('الكل') },
    { id: 'done', label: t('مكتملة') },
  ];
  const priorityOptions: { id: PriorityFilter; label: string }[] = [
    { id: 'any', label: t('أي أولوية') },
    { id: 'high', label: t('عالية') },
    { id: 'medium', label: t('متوسطة') },
    { id: 'low', label: t('منخفضة') },
    { id: 'none', label: t('بدون أولوية') },
  ];

  return (
    <section className="list-page">
      <div className="page-title-row">
        <div>
          <h1>{title}</h1>
          <p>
            {project?.description ||
              (openCount > 0 ? (
                <span aria-label={tasksLabel(openCount)}>
                  <bdi>{formatArNumber(openCount)}</bdi> {t('تنتظر وقتك')}
                </span>
              ) : (
                t('مساحة واضحة لما يستحق انتباهك.')
              ))}
          </p>
          {project?.targetWeeklyMinutes ? (
            <span className="project-target">
              <Timer size={13} />
              {t('هدف التركيز الأسبوعي:')} {formatDuration(project.targetWeeklyMinutes * 60)}
            </span>
          ) : null}
        </div>
        <div className="page-title-actions">
          {project && (
            <div className="page-view-switch" role="group" aria-label={t('تجميع مهام المشروع')}>
              <button type="button" className={listMode === 'combined' ? 'page-view-active' : ''} aria-pressed={listMode === 'combined'} onClick={() => changeListMode('combined')}>{t('عرض موحد')}</button>
              <button type="button" className={listMode === 'separate' ? 'page-view-active' : ''} aria-pressed={listMode === 'separate'} onClick={() => changeListMode('separate')}>{t('مقسمة حسب الموعد')}</button>
            </div>
          )}
          <button
            type="button"
            className={`ghost-button select-toggle ${selecting ? 'select-toggle-on' : ''}`}
            aria-pressed={selecting}
            onClick={() => setSelecting((value) => !value)}
          >
            <Check size={15} />
            {t('تحديد')}
          </button>
          <button className="btn btn-primary primary-button" onClick={onAdd}>
            <Plus size={17} />
            {t('مهمة جديدة')}
          </button>
        </div>
      </div>

      <div className="list-toolbar">
        <div className="segmented-control" role="group" aria-label={t('تصفية حسب الحالة')}>
          {statusOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={status === option.id ? 'segment-active' : ''}
              aria-pressed={status === option.id}
              onClick={() => setStatus(option.id)}
            >{option.label}</button>
          ))}
        </div>
        <div className="filter-chips" role="group" aria-label={t('تصفية حسب الأولوية')}>
          {priorityOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`chip ${priority === option.id ? 'chip-active' : ''}`}
              aria-pressed={priority === option.id}
              onClick={() => setPriority(option.id)}
            >{option.label}</button>
          ))}
        </div>
        {filtersActive && (
          <span className="filter-summary" aria-live="polite">
            <bdi>{formatArNumber(filteredCount)}</bdi> {t('نتيجة')}
            <button type="button" className="text-link" onClick={clearFilters}>{t('مسح')}</button>
          </span>
        )}
      </div>

      {selecting && (
        <div className="selection-bar" role="region" aria-label={t('إجراءات جماعية')}>
          <span className="selection-count" aria-live="polite">
            <bdi>{formatArNumber(selectedIds.length)}</bdi> {t('محددة')}
          </span>
          <div className="selection-actions">
            <button
              type="button"
              className="ghost-button"
              disabled={!selectedIds.length}
              onClick={() => { onBulkComplete(selectedIds); setSelected(new Set()); }}
            >
              <Check size={14} />{t('إكمال')}
            </button>
            <label className="selection-move">
              <span className="visually-hidden">{t('نقل إلى')}</span>
              <select
                value=""
                disabled={!selectedIds.length}
                onChange={(event) => {
                  const value = event.target.value;
                  if (!value) return;
                  onBulkMove(selectedIds, value === 'inbox' ? null : value);
                  setSelected(new Set());
                  event.target.value = '';
                }}
              >
                <option value="">{t('نقل إلى')}…</option>
                <option value="inbox">{t('صندوق الوارد')}</option>
                {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <button
              type="button"
              className="ghost-button danger-button"
              disabled={!selectedIds.length}
              onClick={() => { onBulkDelete(selectedIds); setSelected(new Set()); }}
            >
              <Trash2 size={14} />{t('حذف')}
            </button>
            <button type="button" className="icon-button" onClick={() => setSelecting(false)} aria-label={t('إنهاء التحديد')} title={t('إنهاء التحديد')}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {filteredCount ? (
        <div className="task-groups">
          {[...visibleGroups.entries()].map(([label, list]) => (
            <section className="task-group" key={label}>
              <div className="group-title">
                <span>{t(label)}</span>
                <CountBadge count={list.length} />
              </div>
              <div className="task-list">
                {list.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={currentProject(task.projectId)}
                    today={today}
                    selectable={selecting}
                    selected={selected.has(task.id)}
                    onSelect={() => toggleSelect(task.id)}
                    onComplete={() => onComplete(task.id)}
                    onStart={() => onStart(task.id)}
                    onEdit={() => onEdit(task)}
                    onDelete={() => onDelete(task.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : filtersActive ? (
        <div className="empty-page">
          <h3>{t('لا نتائج مطابقة')}</h3>
          <p>{t('جرّب كلمة أخرى أو امسح عوامل التصفية.')}</p>
          <button className="ghost-button" onClick={clearFilters}>{t('مسح عوامل التصفية')}</button>
        </div>
      ) : (
        <div className="empty-page">
          <h3>{t('لا توجد مهام هنا بعد')}</h3>
          <p>{t('أضف أول مهمة، وسنساعدك على إبقاء الصورة واضحة.')}</p>
          <button className="btn btn-primary primary-button" onClick={onAdd}>
            <Plus size={16} />
            {t('أضف مهمة')}
          </button>
        </div>
      )}
    </section>
  );
}

export default TaskListView;
