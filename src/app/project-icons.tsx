'use client';

/**
 * Maps the React-free project icon catalogue to Tabler components.
 *
 * Kept separate from src/lib/project-icons.ts so the server DTO can import the
 * id list without pulling React into the API bundle. The design gate asserts
 * that every id in the catalogue has an entry here.
 */
import {
  Barbell, BookOpen, Brain, Briefcase, Bulb, Camera, Code2, Coin, Feather, Flask,
  FolderKanban, Globe2, Heart, Home, Languages, Mosque, Music, Notes, Palette,
  Plane, Plant, Rocket, School, Users,
} from './icons';
import type { AppIcon } from './icons';
import { DEFAULT_PROJECT_ICON, type ProjectIconId } from '@/lib/project-icons';

export const projectIcons: Record<ProjectIconId, AppIcon> = {
  code: Code2,
  languages: Languages,
  'book-open': BookOpen,
  feather: Feather,
  globe: Globe2,
  folder: FolderKanban,
  briefcase: Briefcase,
  school: School,
  brain: Brain,
  flask: Flask,
  notes: Notes,
  bulb: Bulb,
  mosque: Mosque,
  heart: Heart,
  barbell: Barbell,
  palette: Palette,
  music: Music,
  camera: Camera,
  coin: Coin,
  rocket: Rocket,
  users: Users,
  home: Home,
  plane: Plane,
  plant: Plant,
};

/** Legacy/unknown values fall back to the folder rather than rendering nothing. */
export function projectIconFor(value: string | null | undefined): AppIcon {
  return (value && projectIcons[value as ProjectIconId]) || projectIcons[DEFAULT_PROJECT_ICON];
}
