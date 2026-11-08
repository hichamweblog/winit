import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_PROJECT_ICON,
  PROJECT_ICON_GROUPS,
  PROJECT_ICON_IDS,
  PROJECT_ICON_LABELS,
  isProjectIcon,
} from './project-icons';
import { projectIcons, projectIconFor } from '../app/project-icons';
import { projectInput } from './server/dto';

test('every icon id has an Arabic label', () => {
  for (const id of PROJECT_ICON_IDS) {
    const label = PROJECT_ICON_LABELS[id];
    assert.ok(label && label.trim().length > 0, `missing label for ${id}`);
    assert.match(label, /[\u0600-\u06FF]/, `label for ${id} is not Arabic`);
  }
  assert.equal(Object.keys(PROJECT_ICON_LABELS).length, PROJECT_ICON_IDS.length);
});

test('every icon id has a React component, so none render as a fallback folder', () => {
  for (const id of PROJECT_ICON_IDS) {
    assert.equal(typeof projectIcons[id], 'function', `missing component for ${id}`);
  }
  assert.equal(Object.keys(projectIcons).length, PROJECT_ICON_IDS.length);
});

test('groups cover the catalogue exactly once — no orphaned or duplicated icon', () => {
  const grouped = PROJECT_ICON_GROUPS.flatMap((group) => group.ids);
  assert.equal(grouped.length, PROJECT_ICON_IDS.length);
  assert.equal(new Set(grouped).size, grouped.length, 'an icon appears in two groups');
  assert.deepEqual([...grouped].sort(), [...PROJECT_ICON_IDS].sort());
  for (const group of PROJECT_ICON_GROUPS) {
    assert.ok(group.label.trim().length > 0);
    assert.ok(group.ids.length > 0, `empty group ${group.label}`);
  }
});

test('ids are unique and the original six keep their position and meaning', () => {
  assert.equal(new Set(PROJECT_ICON_IDS).size, PROJECT_ICON_IDS.length);
  // Existing projects store these strings; reordering or renaming would change
  // what an already-saved project looks like.
  assert.deepEqual(PROJECT_ICON_IDS.slice(0, 6), ['code', 'languages', 'book-open', 'feather', 'globe', 'folder']);
  assert.equal(DEFAULT_PROJECT_ICON, 'folder');
  assert.ok(PROJECT_ICON_IDS.length >= 24, 'the picker should offer a broad set');
});

test('isProjectIcon narrows known values only', () => {
  assert.equal(isProjectIcon('briefcase'), true);
  assert.equal(isProjectIcon('mosque'), true);
  assert.equal(isProjectIcon('folder'), true);
  assert.equal(isProjectIcon('unicorn'), false);
  assert.equal(isProjectIcon(''), false);
});

test('unknown or legacy icon values fall back instead of rendering nothing', () => {
  assert.equal(projectIconFor('unicorn'), projectIcons[DEFAULT_PROJECT_ICON]);
  assert.equal(projectIconFor(null), projectIcons[DEFAULT_PROJECT_ICON]);
  assert.equal(projectIconFor(undefined), projectIcons[DEFAULT_PROJECT_ICON]);
  assert.equal(projectIconFor('rocket'), projectIcons.rocket);
});

test('the API accepts every catalogue icon and rejects anything else', () => {
  for (const id of PROJECT_ICON_IDS) {
    const result = projectInput.safeParse({ name: 'مشروع', icon: id });
    assert.equal(result.success, true, `API rejected picker icon ${id}`);
  }
  assert.equal(projectInput.safeParse({ name: 'مشروع', icon: 'unicorn' }).success, false);
  assert.equal(projectInput.safeParse({ name: 'مشروع' }).success, true); // optional
});
