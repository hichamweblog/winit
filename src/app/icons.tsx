'use client';

/**
 * Icon layer — Tabler Icons.
 *
 * Chosen to match the design system §7 exactly: outline only, 24px grid,
 * rounded caps and joins, stroke 1.75 (Tabler's default is 2). Every icon in the
 * app is imported from here, never from the vendor package directly, so the
 * stroke weight, default size and vendor are changed in one place.
 *
 * No emoji anywhere in the UI: keyboard hints and status glyphs are icons or
 * plain text, never pictographic characters.
 */
import {
  IconActivity,
  IconAlertTriangle,
  IconApple,
  IconArrowBackUp,
  IconArrowDown,
  IconArrowDownLeft,
  IconArrowLeft,
  IconArrowNarrowLeft,
  IconArrowUp,
  IconBarbell,
  IconBed,
  IconBell,
  IconBike,
  IconBolt,
  IconBook2,
  IconBrain,
  IconBriefcase,
  IconBrush,
  IconBuildingMosque,
  IconBulb,
  IconCalendarEvent,
  IconCalendarStar,
  IconCalendarStats,
  IconCamera,
  IconChartHistogram,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCircleCheck,
  IconClock,
  IconCode,
  IconCoin,
  IconDeviceMobile,
  IconDots,
  IconDownload,
  IconDroplet,
  IconEye,
  IconEyeOff,
  IconFeather,
  IconFlag,
  IconFlame,
  IconFlask,
  IconGripVertical,
  IconHeadphones,
  IconHeart,
  IconHeartHandshake,
  IconHome,
  IconInbox,
  IconInfoCircle,
  IconKey,
  IconLanguage,
  IconLayoutDashboard,
  IconLayoutGrid,
  IconLayoutKanban,
  IconListCheck,
  IconLoader2,
  IconLock,
  IconLogout,
  IconMail,
  IconMenu2,
  IconMoon,
  IconMoonStars,
  IconMusic,
  IconNotebook,
  IconNotes,
  IconPalette,
  IconPencil,
  IconPhoneOff,
  IconPlane,
  IconPlant,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconPlus,
  IconPray,
  IconPuzzle,
  IconRocket,
  IconRotate2,
  IconRun,
  IconSchool,
  IconSearch,
  IconSettings,
  IconShieldLock,
  IconSparkles,
  IconSpray,
  IconStopwatch,
  IconSun,
  IconSwimming,
  IconTarget,
  IconToolsKitchen2,
  IconTrash,
  IconTrendingUp,
  IconTrophy,
  IconUser,
  IconUsers,
  IconVaccine,
  IconWalk,
  IconWorld,
  IconX,
  IconYoga,
  type IconProps as TablerIconProps,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';

/** Props the app uses. `strokeWidth` is accepted so call sites stay expressive. */
export type IconProps = Omit<TablerIconProps, 'ref'> & {
  size?: number | string;
  strokeWidth?: number;
};

const DEFAULT_SIZE = 20;
const DEFAULT_STROKE = 1.75; // §7

function styled(Tabler: ComponentType<TablerIconProps>, displayName: string) {
  const Wrapped = ({ size = DEFAULT_SIZE, strokeWidth, stroke, ...rest }: IconProps) => (
    <Tabler size={size} stroke={stroke ?? strokeWidth ?? DEFAULT_STROKE} aria-hidden={rest['aria-label'] ? undefined : true} {...rest} />
  );
  Wrapped.displayName = displayName;
  return Wrapped;
}

/* Semantic names. Call sites read as intent, not as vendor part numbers.
   Each wrapper is annotated PURE so the bundler can drop icons the app never
   uses; without the annotation every wrapper and its Tabler source survives
   tree-shaking and ships to the browser. */
export const Activity = /*#__PURE__*/ styled(IconActivity, 'Activity');

export const AlertTriangle = /*#__PURE__*/ styled(IconAlertTriangle, 'AlertTriangle');
export const ArrowBackUp = /*#__PURE__*/ styled(IconArrowBackUp, 'ArrowBackUp');
export const ArrowDown = /*#__PURE__*/ styled(IconArrowDown, 'ArrowDown');
export const ArrowDownLeft = /*#__PURE__*/ styled(IconArrowDownLeft, 'ArrowDownLeft');
export const ArrowLeft = /*#__PURE__*/ styled(IconArrowLeft, 'ArrowLeft');
export const ArrowNarrowLeft = /*#__PURE__*/ styled(IconArrowNarrowLeft, 'ArrowNarrowLeft');
export const ArrowUp = /*#__PURE__*/ styled(IconArrowUp, 'ArrowUp');
export const Bolt = /*#__PURE__*/ styled(IconBolt, 'Bolt');
export const BookOpen = /*#__PURE__*/ styled(IconBook2, 'BookOpen');
export const CalendarDays = /*#__PURE__*/ styled(IconCalendarEvent, 'CalendarDays');
export const CalendarStats = /*#__PURE__*/ styled(IconCalendarStats, 'CalendarStats');
export const ChartBar = /*#__PURE__*/ styled(IconChartHistogram, 'ChartBar');
export const Check = /*#__PURE__*/ styled(IconCheck, 'Check');
export const ChevronLeft = /*#__PURE__*/ styled(IconChevronLeft, 'ChevronLeft');
export const ChevronRight = /*#__PURE__*/ styled(IconChevronRight, 'ChevronRight');
export const CircleCheck = /*#__PURE__*/ styled(IconCircleCheck, 'CircleCheck');
export const Clock3 = /*#__PURE__*/ styled(IconClock, 'Clock3');
export const Code2 = /*#__PURE__*/ styled(IconCode, 'Code2');
export const Download = /*#__PURE__*/ styled(IconDownload, 'Download');
export const Eye = /*#__PURE__*/ styled(IconEye, 'Eye');
export const EyeOff = /*#__PURE__*/ styled(IconEyeOff, 'EyeOff');
export const Feather = /*#__PURE__*/ styled(IconFeather, 'Feather');
export const Flag = /*#__PURE__*/ styled(IconFlag, 'Flag');
export const Flame = /*#__PURE__*/ styled(IconFlame, 'Flame');
export const FolderKanban = /*#__PURE__*/ styled(IconLayoutKanban, 'FolderKanban');
export const Globe2 = /*#__PURE__*/ styled(IconWorld, 'Globe2');
export const Grid2X2 = /*#__PURE__*/ styled(IconLayoutGrid, 'Grid2X2');
export const GripVertical = /*#__PURE__*/ styled(IconGripVertical, 'GripVertical');
export const Inbox = /*#__PURE__*/ styled(IconInbox, 'Inbox');
export const Info = /*#__PURE__*/ styled(IconInfoCircle, 'Info');
export const Key = /*#__PURE__*/ styled(IconKey, 'Key');
export const Languages = /*#__PURE__*/ styled(IconLanguage, 'Languages');
export const ListTodo = /*#__PURE__*/ styled(IconListCheck, 'ListTodo');
export const Loader = /*#__PURE__*/ styled(IconLoader2, 'Loader');
export const Lock = /*#__PURE__*/ styled(IconLock, 'Lock');
export const Logout = /*#__PURE__*/ styled(IconLogout, 'Logout');
export const Mail = /*#__PURE__*/ styled(IconMail, 'Mail');
export const Menu = /*#__PURE__*/ styled(IconMenu2, 'Menu');
export const Moon = /*#__PURE__*/ styled(IconMoon, 'Moon');
export const MoreHorizontal = /*#__PURE__*/ styled(IconDots, 'MoreHorizontal');
export const NotebookPen = /*#__PURE__*/ styled(IconNotebook, 'NotebookPen');
export const Pause = /*#__PURE__*/ styled(IconPlayerPause, 'Pause');
export const Pencil = /*#__PURE__*/ styled(IconPencil, 'Pencil');
export const Play = /*#__PURE__*/ styled(IconPlayerPlay, 'Play');
export const Plus = /*#__PURE__*/ styled(IconPlus, 'Plus');
export const Reset = /*#__PURE__*/ styled(IconRotate2, 'Reset');
export const Search = /*#__PURE__*/ styled(IconSearch, 'Search');
export const Settings = /*#__PURE__*/ styled(IconSettings, 'Settings');
export const Settings2 = Settings;
export const ShieldLock = /*#__PURE__*/ styled(IconShieldLock, 'ShieldLock');
export const SkipForward = /*#__PURE__*/ styled(IconPlayerSkipForward, 'SkipForward');
export const Sparkles = /*#__PURE__*/ styled(IconSparkles, 'Sparkles');
export const Stopwatch = /*#__PURE__*/ styled(IconStopwatch, 'Stopwatch');
export const Sun = /*#__PURE__*/ styled(IconSun, 'Sun');
export const Target = /*#__PURE__*/ styled(IconTarget, 'Target');
export const Timer = Stopwatch;
export const Trash2 = /*#__PURE__*/ styled(IconTrash, 'Trash2');
export const Trash = Trash2;
export const User = /*#__PURE__*/ styled(IconUser, 'User');
export const X = /*#__PURE__*/ styled(IconX, 'X');

/** Shared lookup type for icon maps (projects, habits, navigation). */

/* Project picker additions. */
export const Barbell = /*#__PURE__*/ styled(IconBarbell, 'Barbell');
export const Brain = /*#__PURE__*/ styled(IconBrain, 'Brain');
export const Briefcase = /*#__PURE__*/ styled(IconBriefcase, 'Briefcase');
export const Bulb = /*#__PURE__*/ styled(IconBulb, 'Bulb');
export const Camera = /*#__PURE__*/ styled(IconCamera, 'Camera');
export const Coin = /*#__PURE__*/ styled(IconCoin, 'Coin');
export const Flask = /*#__PURE__*/ styled(IconFlask, 'Flask');
export const Heart = /*#__PURE__*/ styled(IconHeart, 'Heart');
export const Home = /*#__PURE__*/ styled(IconHome, 'Home');
export const Mosque = /*#__PURE__*/ styled(IconBuildingMosque, 'Mosque');
export const Music = /*#__PURE__*/ styled(IconMusic, 'Music');
export const Notes = /*#__PURE__*/ styled(IconNotes, 'Notes');
export const Palette = /*#__PURE__*/ styled(IconPalette, 'Palette');
export const Plane = /*#__PURE__*/ styled(IconPlane, 'Plane');
export const Plant = /*#__PURE__*/ styled(IconPlant, 'Plant');
export const Rocket = /*#__PURE__*/ styled(IconRocket, 'Rocket');
export const School = /*#__PURE__*/ styled(IconSchool, 'School');
export const Users = /*#__PURE__*/ styled(IconUsers, 'Users');


/* Navigation, settings and statistics. */
export const Bell = /*#__PURE__*/ styled(IconBell, 'Bell');
export const CalendarStar = /*#__PURE__*/ styled(IconCalendarStar, 'CalendarStar');
export const ChevronDown = /*#__PURE__*/ styled(IconChevronDown, 'ChevronDown');
export const ChevronUp = /*#__PURE__*/ styled(IconChevronUp, 'ChevronUp');
export const DeviceMobile = /*#__PURE__*/ styled(IconDeviceMobile, 'DeviceMobile');
export const LayoutDashboard = /*#__PURE__*/ styled(IconLayoutDashboard, 'LayoutDashboard');
export const LayoutGrid = /*#__PURE__*/ styled(IconLayoutGrid, 'LayoutGrid');
export const TrendingUp = /*#__PURE__*/ styled(IconTrendingUp, 'TrendingUp');
export const Trophy = /*#__PURE__*/ styled(IconTrophy, 'Trophy');


/* Habit catalogue. */
export const Apple = /*#__PURE__*/ styled(IconApple, 'Apple');
export const Bed = /*#__PURE__*/ styled(IconBed, 'Bed');
export const Bike = /*#__PURE__*/ styled(IconBike, 'Bike');
export const Brush = /*#__PURE__*/ styled(IconBrush, 'Brush');
export const Droplet = /*#__PURE__*/ styled(IconDroplet, 'Droplet');
export const Headphones = /*#__PURE__*/ styled(IconHeadphones, 'Headphones');
export const HeartHandshake = /*#__PURE__*/ styled(IconHeartHandshake, 'HeartHandshake');
export const MoonStars = /*#__PURE__*/ styled(IconMoonStars, 'MoonStars');
export const PhoneOff = /*#__PURE__*/ styled(IconPhoneOff, 'PhoneOff');
export const Pray = /*#__PURE__*/ styled(IconPray, 'Pray');
export const Puzzle = /*#__PURE__*/ styled(IconPuzzle, 'Puzzle');
export const Run = /*#__PURE__*/ styled(IconRun, 'Run');
export const Swimming = /*#__PURE__*/ styled(IconSwimming, 'Swimming');
export const ToolsKitchen2 = /*#__PURE__*/ styled(IconToolsKitchen2, 'ToolsKitchen2');
export const Vaccine = /*#__PURE__*/ styled(IconVaccine, 'Vaccine');
export const Walk = /*#__PURE__*/ styled(IconWalk, 'Walk');
export const Yoga = /*#__PURE__*/ styled(IconYoga, 'Yoga');

export const Spray = /*#__PURE__*/ styled(IconSpray, 'Spray');

export type AppIcon = ComponentType<IconProps>;
