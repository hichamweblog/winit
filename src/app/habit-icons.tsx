'use client';

/**
 * Maps the React-free habit icon catalogue to Tabler components.
 * Separate from src/lib/habit-icons.ts so the server DTO stays React-free.
 * Tests assert every catalogue id has an entry here.
 */
import {
  Activity, Apple, Barbell, Bed, Bike, BookOpen, Brain, Brush, Bulb, Camera, Coin,
  Droplet, Feather, Headphones, Heart, HeartHandshake, Languages, Mosque, MoonStars,
  Music, PhoneOff, Plant, Pray, Puzzle, Run, School, Spray, Sun, Swimming, Target,
  ToolsKitchen2, Vaccine, Walk, Yoga,
} from './icons';
import type { AppIcon } from './icons';
import { DEFAULT_HABIT_ICON, isHabitIcon, type HabitIconId } from '@/lib/habit-icons';

export const habitIcons: Record<HabitIconId, AppIcon> = {
  'book-open': BookOpen,
  activity: Activity,
  languages: Languages,
  target: Target,
  mosque: Mosque,
  'moon-star': MoonStars,
  beads: Pray,
  'heart-handshake': HeartHandshake,
  run: Run,
  barbell: Barbell,
  walk: Walk,
  yoga: Yoga,
  bike: Bike,
  swim: Swimming,
  heart: Heart,
  droplet: Droplet,
  apple: Apple,
  bed: Bed,
  pill: Vaccine,
  sun: Sun,
  brain: Brain,
  school: School,
  feather: Feather,
  bulb: Bulb,
  headphones: Headphones,
  puzzle: Puzzle,
  plant: Plant,
  coin: Coin,
  palette: Brush,
  music: Music,
  camera: Camera,
  chef: ToolsKitchen2,
  broom: Spray,
  'phone-off': PhoneOff,
};

/** Never throws: unknown legacy values fall back instead of crashing a row. */
export function habitIconFor(value: string | null | undefined): AppIcon {
  return isHabitIcon(value) ? habitIcons[value] : habitIcons[DEFAULT_HABIT_ICON];
}
